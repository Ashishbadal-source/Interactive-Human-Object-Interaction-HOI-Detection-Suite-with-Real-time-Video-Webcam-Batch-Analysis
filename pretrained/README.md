# Model Checkpoints

Due to GitHub's file size limits (>100MB), the pre-trained weights (`*.pth`) are not committed directly to git.

### Required Weights
Place your trained checkpoint weights in this directory:
- `hico-best.pth` (approx. 301 MB) - used by default for HICO-DET inference
- `vcoco-best.pth` (approx. 277 MB) - used for V-COCO inference
- `detr-r50-pre-2stage-nq100.pth` (approx. 281 MB)
- `detr-r50-pre-2stage-nq64.pth` (approx. 281 MB)

For deployment (e.g. Hugging Face Spaces), weights are uploaded using Git LFS or direct storage download.
