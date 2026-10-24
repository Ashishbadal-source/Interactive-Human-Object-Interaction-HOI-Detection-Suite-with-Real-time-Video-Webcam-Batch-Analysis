"""
Batch Image Processing Routes for MUREN AI.
Allows uploading multiple images at once, running inference on each,
and exporting consolidated CSV or HTML audit reports.
"""
import io
import csv
import json
import uuid
import time
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Query
from fastapi.responses import FileResponse, Response, HTMLResponse
from PIL import Image

from ..core.config import settings
from ..services.inference import inference_service

router = APIRouter(prefix="/api/batch", tags=["batch"])

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@router.post("/process")
async def process_batch_images(
    files: List[UploadFile] = File(...),
    min_action_score: float = Form(0.20),
    min_object_score: float = Form(0.50),
    max_interactions: int = Form(5),
):
    """
    Process multiple images in a single batch request.
    Returns aggregated detection summaries and a unique batch_id for report export.
    """
    if not inference_service.model_loaded:
        raise HTTPException(status_code=503, detail="Model engine not loaded")

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")

    if len(files) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 images per batch upload")

    batch_id = uuid.uuid4().hex[:10]
    settings.results_dir.mkdir(parents=True, exist_ok=True)
    batch_upload_dir = settings.results_dir / f"batch_{batch_id}_files"
    batch_upload_dir.mkdir(parents=True, exist_ok=True)

    items = []
    total_latency_ms = 0.0
    total_interactions = 0

    for idx, uploaded_file in enumerate(files):
        filename = uploaded_file.filename or f"image_{idx+1}.jpg"
        ext = Path(filename).suffix.lower()

        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            items.append({
                "index": idx,
                "filename": filename,
                "status": "skipped",
                "error": f"Unsupported format '{ext}'",
                "predictions": [],
                "interaction_count": 0,
            })
            continue

        contents = await uploaded_file.read()
        try:
            pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            items.append({
                "index": idx,
                "filename": filename,
                "status": "failed",
                "error": f"Failed to open image: {str(e)}",
                "predictions": [],
                "interaction_count": 0,
            })
            continue

        # Save thumbnail or copy for batch preview
        thumb_filename = f"thumb_{idx}_{filename}"
        thumb_path = batch_upload_dir / thumb_filename
        pil_img.copy().thumbnail((240, 240))
        pil_img.thumbnail((240, 240))
        pil_img.save(thumb_path, format="JPEG", quality=80)

        t0 = time.perf_counter()
        try:
            result = inference_service.predict(
                image=pil_img,
                min_action_score=min_action_score,
                min_object_score=min_object_score,
                max_interactions=max_interactions,
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            total_latency_ms += elapsed_ms

            preds = result.get("predictions", [])
            total_interactions += len(preds)

            items.append({
                "index": idx,
                "filename": filename,
                "status": "completed",
                "result_id": result.get("result_id"),
                "thumbnail_url": f"/api/batch/{batch_id}/thumb/{idx}",
                "annotated_url": f"/api/result/{result.get('result_id')}/image",
                "inference_time_ms": round(elapsed_ms, 1),
                "width": result.get("original_width", pil_img.width),
                "height": result.get("original_height", pil_img.height),
                "interaction_count": len(preds),
                "predictions": preds,
            })
        except Exception as err:
            items.append({
                "index": idx,
                "filename": filename,
                "status": "failed",
                "error": str(err),
                "predictions": [],
                "interaction_count": 0,
            })

    summary = {
        "batch_id": batch_id,
        "created_at": datetime.now().isoformat(),
        "total_images": len(files),
        "successful_images": sum(1 for it in items if it["status"] == "completed"),
        "total_interactions_detected": total_interactions,
        "avg_inference_time_ms": round(total_latency_ms / max(1, len(items)), 1),
        "items": items,
    }

    # Save metadata JSON for reports
    meta_path = settings.results_dir / f"batch_{batch_id}_meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return summary


@router.get("/{batch_id}/results")
async def get_batch_results(batch_id: str):
    """Retrieve saved metadata for a batch processing run."""
    meta_path = settings.results_dir / f"batch_{batch_id}_meta.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Batch result not found")
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/{batch_id}/thumb/{index}")
async def get_batch_thumbnail(batch_id: str, index: int):
    """Serve thumbnail for an image in the batch."""
    batch_upload_dir = settings.results_dir / f"batch_{batch_id}_files"
    if not batch_upload_dir.exists():
        raise HTTPException(status_code=404, detail="Batch directory not found")

    # Find file matching thumb_{index}_*
    matches = list(batch_upload_dir.glob(f"thumb_{index}_*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(str(matches[0]), media_type="image/jpeg")


@router.get("/{batch_id}/csv")
async def export_batch_csv(batch_id: str):
    """
    Export all detected HOI interactions in the batch to CSV format.
    """
    meta_path = settings.results_dir / f"batch_{batch_id}_meta.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Batch not found")

    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Batch ID", "Image Index", "Filename", "Query ID",
        "Subject", "Action (Verb)", "Target Object",
        "Action Score", "Object Score",
        "Subject BBox [x1, y1, x2, y2]", "Object BBox [x1, y1, x2, y2]"
    ])

    for item in data.get("items", []):
        fn = item.get("filename", "")
        idx = item.get("index", 0)
        for pred in item.get("predictions", []):
            writer.writerow([
                batch_id,
                idx,
                fn,
                pred.get("query_id", ""),
                pred.get("subject_label", "person"),
                pred.get("primary_action", ""),
                pred.get("object_label", ""),
                f"{pred.get('primary_action_score', 0.0):.4f}",
                f"{pred.get('object_score', 0.0):.4f}",
                str(pred.get("subject_box", [])),
                str(pred.get("object_box", [])),
            ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=muren_batch_{batch_id}.csv"}
    )


@router.get("/{batch_id}/report")
async def export_batch_html_report(batch_id: str):
    """
    Generate an academic-grade, printable HTML report of the entire batch analysis.
    """
    meta_path = settings.results_dir / f"batch_{batch_id}_meta.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Batch not found")

    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    total_imgs = data.get("total_images", 0)
    success_imgs = data.get("successful_images", 0)
    total_hois = data.get("total_interactions_detected", 0)
    avg_ms = data.get("avg_inference_time_ms", 0)

    # Compute action distribution
    action_counts = {}
    for item in data.get("items", []):
        for pred in item.get("predictions", []):
            act = pred.get("primary_action", "unknown")
            action_counts[act] = action_counts.get(act, 0) + 1

    sorted_actions = sorted(action_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    rows = ""
    for item in data.get("items", []):
        fn = item.get("filename", "")
        status = item.get("status", "")
        cnt = item.get("interaction_count", 0)
        ms = item.get("inference_time_ms", "-")
        preds = item.get("predictions", [])

        action_summary = ", ".join([f"{p.get('primary_action')} ({p.get('object_label')})" for p in preds[:4]])
        if len(preds) > 4:
            action_summary += f" +{len(preds)-4} more"

        badge_color = "#10b981" if status == "completed" else "#f43f5e"

        rows += f"""<tr>
            <td><strong>{fn}</strong></td>
            <td><span style="color: {badge_color}; font-weight: 600;">{status}</span></td>
            <td>{cnt}</td>
            <td>{ms} ms</td>
            <td style="font-size: 12px; color: #94a3b8;">{action_summary or 'None'}</td>
        </tr>"""

    action_pills = "".join([
        f"<span style='background: rgba(6, 182, 212, 0.15); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.3); padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;'>{act}: {num}</span> "
        for act, num in sorted_actions
    ])

    pills_html = action_pills if action_pills else '<span style="color: #64748b;">No actions detected</span>'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>MUREN AI Batch HOI Report - {batch_id}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0b0f19;
            color: #f1f5f9;
            margin: 0;
            padding: 40px;
        }}
        .report-card {{
            max-width: 1100px;
            margin: 0 auto;
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 12px;
            padding: 36px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }}
        h1 {{ margin: 0 0 8px; font-size: 24px; color: #f8fafc; }}
        .header-meta {{ font-size: 13px; color: #94a3b8; margin-bottom: 24px; }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }}
        .metric-box {{
            background: #1f2937;
            padding: 16px;
            border-radius: 8px;
            border-left: 4px solid #06b6d4;
        }}
        .metric-title {{ font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }}
        .metric-value {{ font-size: 24px; font-weight: 700; color: #f8fafc; font-family: monospace; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 16px;
        }}
        th, td {{
            padding: 12px 14px;
            text-align: left;
            border-bottom: 1px solid #1f2937;
        }}
        th {{ background: #1f2937; color: #cbd5e1; font-weight: 600; }}
        tr:hover {{ background: rgba(255,255,255,0.02); }}
        .btn-print {{
            background: #06b6d4;
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            float: right;
        }}
        @media print {{
            body {{ background: #fff; color: #000; padding: 0; }}
            .report-card {{ border: none; box-shadow: none; background: #fff; color: #000; padding: 0; }}
            .btn-print {{ display: none; }}
            th {{ background: #eee; color: #000; }}
            td, th {{ border-bottom: 1px solid #ccc; color: #000; }}
            .metric-box {{ background: #f8f8f8; color: #000; border-left: 4px solid #000; }}
            .metric-value, h1 {{ color: #000; }}
        }}
    </style>
</head>
<body>
    <div class="report-card">
        <button class="btn-print" onclick="window.print()">Print / Save PDF</button>
        <h1>MUREN AI: Batch HOI Inspection Audit Report</h1>
        <div class="header-meta">
            Batch ID: <code>{batch_id}</code> • Generated: {date_str} • Model: MUREN ResNet-50 Dual-Branch Transformer
        </div>

        <div class="metrics-grid">
            <div class="metric-box">
                <div class="metric-title">Total Images</div>
                <div class="metric-value">{total_imgs}</div>
            </div>
            <div class="metric-box" style="border-left-color: #10b981;">
                <div class="metric-title">Processed Successfully</div>
                <div class="metric-value">{success_imgs} / {total_imgs}</div>
            </div>
            <div class="metric-box" style="border-left-color: #8b5cf6;">
                <div class="metric-title">Total Interactions</div>
                <div class="metric-value">{total_hois}</div>
            </div>
            <div class="metric-box" style="border-left-color: #f59e0b;">
                <div class="metric-title">Avg Latency</div>
                <div class="metric-value">{avg_ms} ms</div>
            </div>
        </div>

        <h3 style="margin-bottom: 12px; color: #e2e8f0;">Dominant HOI Action Classes</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px;">
            {pills_html}
        </div>


        <h3 style="margin-bottom: 8px; color: #e2e8f0;">Per-Image Interaction Breakdown</h3>
        <table>
            <thead>
                <tr>
                    <th>Filename</th>
                    <th>Status</th>
                    <th>Interactions</th>
                    <th>Latency</th>
                    <th>Detected HOI Actions</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>

        <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #1f2937; font-size: 12px; color: #64748b; text-align: center;">
            MUREN AI Research Suite • HICO-DET Dual-Branch Transformer Engine • Automated Batch Audit
        </div>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html)
