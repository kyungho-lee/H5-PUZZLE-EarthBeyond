"""
Era 1 (theme1) / Era 2 (theme2) 크롭 스크립트
원본: assets/source/202606150253_theme1.jpeg (2048x2048, 3x4 그리드)
원본: assets/source/202606150253_theme2.jpeg (2048x2048, 4x4 그리드)
출력: src/themes/primordial-earth/step-01~11.webp (256x256)
      src/themes/human-civilization/step-01~11.webp (256x256)
"""

from PIL import Image
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_SIZE = (256, 256)

def crop_grid(img, pad, gap, cols):
    W, H = img.size
    cell = (W - pad * 2 - gap * (cols - 1)) // cols
    def box(row, col):
        x = pad + col * (cell + gap)
        y = pad + row * (cell + gap)
        return (x, y, x + cell, y + cell)
    return box, cell

def save_step(img, box_fn, row, col, out_path):
    box = box_fn(row, col)
    cropped = img.crop(box)
    resized = cropped.resize(OUT_SIZE, Image.LANCZOS)
    resized.save(out_path, "WEBP", quality=90)
    kb = os.path.getsize(out_path) / 1024
    return kb

# ── Era 1: Primordial Earth ──────────────────────────────────
# 3행 × 4열, 마지막 셀(row2,col2=은하)은 중복 — 스킵
# step-11 = row2, col3 (포유류)
print("=== Era 1: Primordial Earth ===")
img1 = Image.open(os.path.join(BASE, "assets", "source", "202606150253_theme1.jpeg"))
out1 = os.path.join(BASE, "src", "themes", "primordial-earth")
os.makedirs(out1, exist_ok=True)

box1, cell1 = crop_grid(img1, pad=10, gap=10, cols=4)
print(f"셀 크기: {cell1}x{cell1}")

steps_era1 = [
    (1,  0, 0, "Stardust & Molecular Cloud"),
    (2,  0, 1, "Protoplanetary Disk"),
    (3,  0, 2, "Magma Ocean Earth"),
    (4,  0, 3, "Moon-forming Impact"),
    (5,  1, 0, "First Oceans"),
    (6,  1, 1, "Stromatolites"),
    (7,  1, 2, "Great Oxidation Event"),
    (8,  1, 3, "Cambrian Explosion"),
    (9,  2, 0, "Age of Dinosaurs"),
    (10, 2, 1, "K-Pg Extinction"),
    # row2,col2 은하 — 스킵
    (11, 2, 3, "Rise of Mammals"),
]

for step_num, row, col, name in steps_era1:
    out_path = os.path.join(out1, f"step-{step_num:02d}.webp")
    kb = save_step(img1, box1, row, col, out_path)
    print(f"step-{step_num:02d}.webp ({name}) [{kb:.1f} KB]")

# ── Era 2: Human Civilization ────────────────────────────────
# 4행 × 4열, 달 착륙(row2,col2)까지만 사용 — step-01~11
print("\n=== Era 2: Human Civilization ===")
img2 = Image.open(os.path.join(BASE, "assets", "source", "202606150253_theme2.jpeg"))
out2 = os.path.join(BASE, "src", "themes", "human-civilization")
os.makedirs(out2, exist_ok=True)

box2, cell2 = crop_grid(img2, pad=10, gap=10, cols=4)
print(f"셀 크기: {cell2}x{cell2}")

steps_era2 = [
    (1,  0, 0, "Stone Age Cave Art"),
    (2,  0, 1, "Agricultural Revolution"),
    (3,  0, 2, "Ancient Civilizations"),
    (4,  0, 3, "Classical Antiquity"),
    (5,  1, 0, "Age of Exploration"),
    (6,  1, 1, "Scientific Revolution"),
    (7,  1, 2, "Industrial Revolution"),
    (8,  1, 3, "Electrical Age"),
    (9,  2, 0, "Atomic Age"),
    (10, 2, 1, "Digital Revolution"),
    (11, 2, 2, "Apollo Moon Landing"),
]

for step_num, row, col, name in steps_era2:
    out_path = os.path.join(out2, f"step-{step_num:02d}.webp")
    kb = save_step(img2, box2, row, col, out_path)
    print(f"step-{step_num:02d}.webp ({name}) [{kb:.1f} KB]")

print("\n완료!")
