"""
solar-system theme3 이미지 크롭 스크립트
원본: assets/source/202606150253_theme3.jpeg (2048x2048)
출력: src/themes/solar-system/step-01.webp ~ step-10.webp (256x256)
step-11: assets/source/202606150307_step-11.jpeg → 256x256 리사이즈
"""

from PIL import Image
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_THEME3 = os.path.join(BASE, "assets", "source", "202606150253_theme3.jpeg")
SRC_STEP11 = os.path.join(BASE, "assets", "source", "202606150307_step-11.jpeg")
OUT_DIR = os.path.join(BASE, "src", "themes", "solar-system")
OUT_SIZE = (256, 256)

os.makedirs(OUT_DIR, exist_ok=True)

img = Image.open(SRC_THEME3)
W, H = img.size
print(f"원본 크기: {W}x{H}")

# 4x4 그리드 셀 크기 (경계선 포함 여유 제거)
# 이미지 분석: 셀 간 약 10px 간격, 외곽 약 10px 패딩
PAD = 10   # 외곽 패딩
GAP = 10   # 셀 간격
CELL = (W - PAD * 2 - GAP * 3) // 4  # 셀 1개 크기

print(f"셀 크기: {CELL}x{CELL}")

def cell_box(row, col):
    x = PAD + col * (CELL + GAP)
    y = PAD + row * (CELL + GAP)
    return (x, y, x + CELL, y + CELL)

# step 번호 → (row, col) 매핑
# Row 0: 수성(01), 금성(02), 지구(03), 화성(04)
# Row 1: 목성(05), 토성(06), 천왕성(07), 해왕성(08)
# Row 2: 명왕성(09), 태양(10)
steps = [
    (1, 0, 0, "Mercury"),
    (2, 0, 1, "Venus"),
    (3, 0, 2, "Earth"),
    (4, 0, 3, "Mars"),
    (5, 1, 0, "Jupiter"),
    (6, 1, 1, "Saturn"),
    (7, 1, 2, "Uranus"),
    (8, 1, 3, "Neptune"),
    (9, 2, 0, "Pluto"),
    (10, 2, 1, "Sun"),
]

for step_num, row, col, name in steps:
    box = cell_box(row, col)
    cropped = img.crop(box)
    resized = cropped.resize(OUT_SIZE, Image.LANCZOS)
    out_path = os.path.join(OUT_DIR, f"step-{step_num:02d}.webp")
    resized.save(out_path, "WEBP", quality=90)
    print(f"step-{step_num:02d}.webp ({name}) → box={box}")

# step-11: 리사이즈만
img11 = Image.open(SRC_STEP11)
print(f"\nstep-11 원본 크기: {img11.size}")
img11_resized = img11.resize(OUT_SIZE, Image.LANCZOS)
out11 = os.path.join(OUT_DIR, "step-11.webp")
img11_resized.save(out11, "WEBP", quality=90)
print(f"step-11.webp (Solar System) → {OUT_SIZE}")

print(f"\n완료! {OUT_DIR}")
