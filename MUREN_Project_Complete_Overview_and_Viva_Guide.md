# 🧠 MUREN AI: Human-Object Interaction (HOI) Detection
### Complete Project Guide, Architecture, Dataset, Pipeline & 50+ Viva Questions
> **Course:** 5th Semester • Computer Vision Project  
> **Student:** Ashish Badal  
> **Reference Paper:** CVPR 2023 (*"Relational Context Learning for Human-Object Interaction Detection"* - POSTECH)

---

## 📌 Executive Summary (1-Minute Pitch for Viva)
> *"Respected Examiner, my 5th-semester Computer Vision project implements **MUREN** (CVPR 2023). While standard object detection (like YOLO) only identifies what objects exist and where they are, our project performs **Human-Object Interaction (HOI) Detection**. It localizes humans and objects using bounding boxes and predicts the active relationship between them as **`<Subject, Verb, Object>`** triplets (e.g., `<person, ride, bicycle>`, `<person, talk_on, cell phone>`).*  
> *The model is built on an end-to-end **Transformer architecture** featuring a novel **Three-Branch Decoder** (Human, Object, and Relation branches) combined with a **MURE (Multiplex Relation)** module and **ATF (Attention Task Fusion)** module. Trained on the benchmark **HICO-DET** dataset across 80 objects and 117 verbs, it achieves a competitive **32.87 mAP**. We have deployed it as a full-stack web application supporting Single Image analysis with XAI attention heatmaps, Video temporal action tracking, Real-time Webcam streaming over WebSockets, and Batch dataset audits."*

---

## 1. Project Introduction: What is HOI Detection?
Human-Object Interaction (HOI) Detection is a sub-field of Computer Vision that aims to understand the semantic actions humans perform on objects in a visual scene.

### Key Difference from Traditional Computer Vision Tasks:
| Task | What it outputs | Example |
| :--- | :--- | :--- |
| **Image Classification** | Single label for entire image | *"Street scene"* |
| **Object Detection (YOLO/Faster R-CNN)** | Bounding boxes + Object classes | `[Box1: Person]`, `[Box2: Bicycle]` |
| **HOI Detection (MUREN)** | Interacting pairs + Bounding boxes + Action verb | **`<Person Box, ride (0.92), Bicycle Box>`** |

### Output Triplet Format:
$$\text{Interaction Triplet} = \langle \text{Subject (Human)}, \text{Action (Verb)}, \text{Target (Object)} \rangle$$

---

## 2. Problem Statement & Challenges
### Why is HOI much harder than Object Detection?
1. **Combinatorial Complexity:** 80 objects and 117 verbs create 600+ valid combinations. A human can interact with multiple objects in a single frame.
2. **Multi-label Actions:** Actions are not mutually exclusive. A person can simultaneously `hold`, `inspect`, and `talk_on` a phone.
3. **Long-tail Class Imbalance:** Everyday actions (like `hold phone`) have thousands of training samples, while rare actions (like `hug giraffe` or `direct airplane`) have fewer than 10 samples.
4. **Spatial Non-locality:** The interacting object might be physically far from the person (e.g., `<person, fly, kite>`). Standard CNN receptive fields fail to link them.

---

## 3. Dataset Specifications

### A. Primary Dataset: HICO-DET
* **Full Name:** Humans Interacting with Common Objects – Detection
* **Total Images:** 47,776 images (38,118 training / 9,658 testing)
* **Object Classes:** **80 classes** (Identical to standard MS-COCO objects)
* **Action/Verb Classes:** **117 verbs** (ride, hold, eat, carry, sit_on, talk_on, etc.)
* **HOI Categories:** **600 unique `<verb, object>` interaction categories**
* **Instances:** 150,000+ annotated human-object interaction pairs
* **Evaluation Categories:**
  * **Full (600 classes):** All interaction categories
  * **Rare (138 classes):** Categories with fewer than 10 training instances
  * **Non-Rare (462 classes):** Categories with 10 or more training instances

### B. Secondary Dataset: V-COCO (Verbs in COCO)
* **Total Images:** 10,346 images (derived from MS-COCO)
* **Object Classes:** 81 classes (80 COCO objects + 1 background)
* **Verb Classes:** 29 action categories
* **Evaluation Metric:** Role Mean Average Precision ($mAP_{role}$)

---

## 4. Model Architecture (MUREN)
MUREN stands for **MUltiplex RElation Network**. It extends the DETR (DEtection TRansformer) philosophy into a multi-branch relational framework.

```
Input Image [3, H, W]
       │
       ▼
┌──────────────────────────────────────────────┐
│  1. Backbone: ResNet-50 (ImageNet-1K)        │ ──► Extracts 2048-dim feature maps
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  2. 1x1 Convolution Projection               │ ──► Reduces 2048 to d_model = 256
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  3. Transformer Encoder (6 Layers, 8 Heads)  │ ──► Global Self-Attention
└──────────────────────────────────────────────┘     Generates 'Memory'
       │
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│  4. Three-Branch Transformer Decoder (6 Layers)                        │
│                                                                        │
│   Human Branch (64 Qs)   Object Branch (64 Qs)   Relation Branch (64 Qs│
│         │                         │                        │           │
│         └───────────────┬─────────┴────────────────────────┘           │
│                         ▼                                              │
│         ┌─────────────────────────────────────────────┐                │
│         │  MURE Module (Multiplex Relation Encoder)   │                │
│         │  - Ternary Relation (Concat H+O+R)          │                │
│         │  - Unary Self-Attention                     │                │
│         │  - Pairwise Cross-Attention (H-O, H-R, O-R) │                │
│         │  - Cross-Attention with Encoder Memory      │                │
│         └─────────────────────────────────────────────┘                │
│                         │ Multiplex Relational Context                 │
│                         ▼                                              │
│         ┌─────────────────────────────────────────────┐                │
│         │  ATF Module (Attention-based Task Fusion)   │                │
│         │  Gated injection back to H, O, R branches   │                │
│         └─────────────────────────────────────────────┘                │
└────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│  5. Prediction Heads                                                   │
│   - sub_bbox_embed: MLP (256 -> 4)  ==> Human Box [cx, cy, w, h]       │
│   - obj_bbox_embed: MLP (256 -> 4)  ==> Object Box [cx, cy, w, h]      │
│   - obj_class_embed: Linear (256 -> 81) ==> Object Class (Softmax)     │
│   - verb_class_embed: Linear (256 -> 117) ==> Action Verbs (Sigmoid)   │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Architecture Components:
1. **ResNet-50 Backbone:** Pre-trained on ImageNet. Frozen BatchNorm (`FrozenBatchNorm2d`) is used to stabilize training on small batch sizes.
2. **Sine Positional Encoding:** Injects spatial awareness into permutation-invariant Transformer attention layers.
3. **Transformer Encoder (6 Layers):** Processes visual features across the entire image with multi-head self-attention ($d_{model} = 256, \text{heads} = 8, d_{ffn} = 2048$).
4. **Three-Branch Decoder (6 Layers):** Decouples human localization, object localization, and verb classification into 3 specialized query paths (64 queries each).
5. **MURE Module (Core Innovation):** Computes **Ternary** (all 3 together), **Unary** (independent entity attention), and **Pairwise** ($H \times O, H \times R, O \times R$) interactions.
6. **ATF Module:** Adaptively injects relation features back into task queries using a dynamic Sigmoid gating mechanism:
   $$\text{Output} = \text{Task\_Feat} + \sigma(\text{MLP}(\text{Task}, \text{Context})) \odot \text{MLP}(\text{Task}, \text{Context})$$

---

## 5. Working Pipeline (Input to Output Flow)
1. **Preprocessing:** Image resized (short side = 800px, max side = 1333px), normalized with ImageNet mean `[0.485, 0.456, 0.406]` and std `[0.229, 0.224, 0.225]`.
2. **Backbone & Encoding:** ResNet-50 extracts features, $1 \times 1$ conv reduces channels to 256, encoder produces global memory.
3. **Parallel Query Decoding:** 64 learnable queries per branch pass through 6 decoder layers, dynamically communicating via MURE + ATF.
4. **Feed-Forward Predictions:**
   * Human box: Sigmoid normalized $(cx, cy, w, h)$
   * Object box: Sigmoid normalized $(cx, cy, w, h)$
   * Object class: 81-dimensional Softmax logits
   * Verb action: 117-dimensional Sigmoid probabilities (multi-label)
5. **Post-Processing & Filtering:**
   * Coordinates converted from $(cx, cy, w, h) \to (x_1, y_1, x_2, y_2)$ and scaled to original image dimensions.
   * Action score calculated: $\text{Score} = \text{Verb\_Prob} \times \text{Object\_Prob}$.
   * Filtered by thresholds: `min_action_score >= 0.20` and `min_object_score >= 0.50`.

---

## 6. Training Details & Loss Functions
Training uses **Bipartite Matching** via the **Hungarian Algorithm** (`scipy.optimize.linear_sum_assignment`).

$$\mathcal{L}_{\text{total}} = \lambda_{\text{obj}} \mathcal{L}_{\text{obj\_ce}} + \lambda_{\text{verb}} \mathcal{L}_{\text{verb\_focal}} + \lambda_{\text{bbox}} (\mathcal{L}_{\text{sub\_bbox}} + \mathcal{L}_{\text{obj\_bbox}}) + \lambda_{\text{giou}} (\mathcal{L}_{\text{sub\_giou}} + \mathcal{L}_{\text{obj\_giou}})$$

| Loss Component | Type | Coefficient ($\lambda$) | Purpose |
| :--- | :--- | :--- | :--- |
| **Object Loss** | Cross-Entropy | $1.0$ | Correct object classification |
| **Verb Loss** | Focal Loss ($\alpha=0.5$) | $2.0$ | Handles severe verb class imbalance |
| **BBox Loss** | L1 Loss | $2.5$ | Accurate box center and scale |
| **GIoU Loss** | Generalized IoU | $1.0$ | Bounding box spatial convergence |

* **Optimizer:** AdamW (`lr = 1e-4`, `lr_backbone = 1e-5`, `weight_decay = 1e-4`)
* **Epochs:** 100 epochs (Learning rate drops by 10x at epoch 60 via `StepLR`)
* **Auxiliary Loss:** Enabled on all intermediate decoder layers to enforce strong gradient propagation.

---

## 7. Benchmark Results & Performance Comparison
Evaluated on the **HICO-DET** test set at $\text{IoU} \ge 0.5$:

| Model | Venue | Backbone | Full mAP | Rare mAP | Non-Rare mAP | Known Object (KO) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **QPIC** | CVPR 2021 | ResNet-50 | 29.07 | 21.85 | 31.23 | 31.68 |
| **CDN** | NeurIPS 2021 | ResNet-50 | 31.44 | 27.39 | 32.64 | 34.09 |
| **MUREN (This Project)** | **CVPR 2023** | **ResNet-50** | **32.87** | **28.67** | **34.12** | **35.52** |
| **MUREN (DC5)** | **CVPR 2023** | **ResNet-50-DC5** | **34.25** | **30.12** | **35.48** | **37.10** |

---

## 8. Full-Stack Web Application Features
1. **Photo Analysis (Tab 1):** Interactive HTML5 canvas with hover highlight, threshold sliders (Action Score: 0.20, Object: 0.50), JSON viewer, and **Explainable AI (XAI)** cross-attention heatmaps.
2. **Video Tracking (Tab 2):** Frame-by-frame sampling, spatial IoU consistency tracking over time, **Action Interval** clustering, and annotated video download.
3. **Real-Time Webcam (Tab 3):** Bi-directional WebSocket (`/api/webcam/stream`) transmitting base64 frames for live interactive inference.
4. **Batch Processing & Reports (Tab 4):** Upload up to 50 images simultaneously, action frequency breakdown, CSV export, and printable HTML audit reports.
5. **One-Click Runner (`start_demo.bat`):** Starts FastAPI server + Cloudflare live HTTPS tunnel for instant remote demo.

---

## 9. Top 30 Viva Questions & Answers (Examiner Preparation)

### 🟢 Category 1: Basic & Conceptual Questions
**Q1: What is the main objective of your project?**  
*A: To detect Human-Object Interactions (HOI) in images and videos, outputting `<Subject, Action Verb, Object>` triplets along with localized bounding boxes.*

**Q2: How does HOI detection differ from standard Object Detection?**  
*A: Object detection answers "what and where" (e.g., person, horse). HOI detection answers "what is the person doing with that object" (e.g., person riding horse vs. person grooming horse).*

**Q3: What does MUREN stand for?**  
*A: MUltiplex RElation Network.*

**Q4: Which benchmark datasets are used in this project?**  
*A: HICO-DET (47,776 images, 80 objects, 117 verbs, 600 HOI categories) and V-COCO (10,346 images, 81 objects, 29 verbs).*

**Q5: What are the evaluation metrics for HOI detection?**  
*A: Mean Average Precision (mAP) evaluated at an IoU threshold of 0.5 for both human and object bounding boxes, categorized into Full, Rare, and Non-Rare sets.*

---

### 🟡 Category 2: Architecture & Transformer Mechanics
**Q6: What is the backbone network and why was it chosen?**  
*A: ResNet-50 pre-trained on ImageNet-1K. It provides a robust, standardized visual feature extractor while keeping computation manageable on commodity GPUs and CPUs.*

**Q7: Explain the Three-Branch Decoder in MUREN.**  
*A: Instead of forcing a single query to predict humans, objects, and actions together, MUREN uses three specialized query branches: (1) Human branch, (2) Object branch, and (3) Relation branch. Each branch specializes in its own task.*

**Q8: What is the MURE module and what problem does it solve?**  
*A: MURE (Multiplex Relation Encoder) enables cross-communication between the three branches. It computes Unary, Pairwise, and Ternary relationships so the branches don't make isolated, contradictory predictions.*

**Q9: What is the ATF module?**  
*A: ATF (Attention-based Task Fusion) takes the multiplex relational context generated by MURE and injects it back into each individual branch using a dynamic Sigmoid gating mechanism.*

**Q10: Why do we use Positional Encoding in the Transformer?**  
*A: Transformer self-attention is permutation-invariant (it does not know the relative spatial positions of pixels). Sine positional encodings inject 2D coordinate information into the feature tokens.*

**Q11: Why are there 64 query slots?**  
*A: 64 queries represent the maximum number of potential interaction candidates the model can predict per image. For HICO-DET, 64 is optimal; for V-COCO, 100 queries are typically used.*

---

### 🟣 Category 3: Training & Loss Functions
**Q12: Why is Focal Loss used for verb classification instead of Cross-Entropy?**  
*A: The 117 verbs suffer from extreme class imbalance (some verbs have thousands of examples, others fewer than 10). Focal Loss down-weights easy negatives and focuses gradient updates on rare and hard action classes.*

**Q13: Why does the verb classification head use Sigmoid instead of Softmax?**  
*A: A person can perform multiple actions with an object simultaneously (e.g., `<person, hold, phone>` and `<person, talk_on, phone>`). Sigmoid allows multi-label independent probabilities, whereas Softmax assumes mutually exclusive classes.*

**Q14: How does the Hungarian Matching algorithm work?**  
*A: The model outputs 64 fixed predictions, but ground truth images only have a few interactions. The Hungarian algorithm solves a bipartite matching problem to find the optimal 1-to-1 assignment that minimizes total classification and bounding box cost.*

**Q15: What is GIoU loss and why is it needed alongside L1 loss?**  
*A: Standard L1 loss measures coordinate distance. Generalized IoU measures box overlap and provides a gradient even when the predicted box and ground truth box have zero intersection.*

**Q16: What is Auxiliary Loss?**  
*A: Loss computed on the intermediate outputs of all 6 decoder layers, not just the final layer. This stabilizes training and ensures early layers learn discriminative features.*

---

### 🔴 Category 4: System Implementation & Comparison
**Q17: What was the drawback of older two-stage HOI models?**  
*A: Two-stage models first ran an object detector, formed all possible human-object pairs, and then classified them. This caused severe error accumulation, quadratic $O(N \times M)$ pairing bottlenecks, and slow inference.*

**Q18: What is the advantage of an End-to-End One-Stage model like MUREN?**  
*A: Direct mapping from input image to interaction triplets in a single forward pass without separate detection or heuristics, making it faster and globally optimized.*

**Q19: Can this model run on CPU?**  
*A: Yes! On CPU, inference takes approximately 600ms - 1200ms per image. On GPU, it takes 40ms - 60ms.*

**Q20: How does your system track actions in video?**  
*A: It samples frames, runs MUREN per frame, and associates consecutive predictions using spatial IoU tracking (human box IoU $\ge 0.20$ and object box IoU $\ge 0.15$) to construct temporal Action Intervals.*

**Q21: How are XAI (Explainable AI) Attention Heatmaps generated?**  
*A: By computing the cross-attention dot product between the relation query vector and the encoder spatial memory, resizing it via bilinear interpolation, and overlaying it as a Turbo colormap on the original image.*

---

## 10. Quick Revision Cheat Sheet
| Parameter | Value / Answer |
| :--- | :--- |
| **Model Name** | MUREN (MUltiplex RElation Network) |
| **Conference** | CVPR 2023 |
| **Dataset** | HICO-DET (80 objects, 117 verbs, 600 HOI triplets) |
| **Default mAP** | 32.87 mAP (Known Object: 35.52 mAP) |
| **Backbone** | ResNet-50 (ImageNet Pretrained) |
| **Transformer** | 6 Encoder Layers + 6 Decoder Layers ($d = 256$) |
| **Query Slots** | 64 Queries per branch |
| **Verb Loss** | Focal Loss ($\alpha = 0.5$) |
| **Box Loss** | L1 Loss ($\lambda = 2.5$) + GIoU Loss ($\lambda = 1.0$) |
| **Matching Algorithm** | Hungarian Bipartite Matching |
| **Web Stack** | FastAPI + PyTorch + React 18 + TypeScript + WebSockets |
| **Demo Command** | Run `start_demo.bat` -> Open `http://localhost:8000` |
