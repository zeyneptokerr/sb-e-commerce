#!/usr/bin/env python3
"""Download distinct product image URLs and replace DB URLs with local paths.

Uses the PostgreSQL connection settings in sb-ecom/src/main/resources/application.properties.
Downloaded files go to sb-ecom/images/catalog; products.image is updated only
for successfully downloaded images. A CSV mapping is kept for auditing/re-runs.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
import csv
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "sb-ecom"
IMAGE_DIR = APP / "images" / "catalog"
MANIFEST = Path(__file__).resolve().parent / "product-image-local-map.csv"
MAPPING_CSV = Path(__file__).resolve().parent / "product-image-update-map.csv"
PSQL = os.environ.get("PSQL", "psql")
DB_HOST = os.environ.get("PGHOST", "localhost")
DB_PORT = os.environ.get("PGPORT", "5432")
DB_NAME = os.environ.get("PGDATABASE", "ecommerce")
DB_USER = os.environ.get("PGUSER", "postgres")


def psql_args():
    return [PSQL, "-q", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER, "-d", DB_NAME, "-v", "ON_ERROR_STOP=1"]


def read_urls():
    result = subprocess.run(
        psql_args() + ["-At", "-c", "SELECT DISTINCT image FROM public.products WHERE image ~ '^https?://' ORDER BY image"],
        check=True, text=True, capture_output=True,
    )
    return result.stdout.splitlines()


def image_extension(url, content_type):
    ext = Path(urlparse(url).path).suffix.lower()
    if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}:
        return ".jpg" if ext == ".jpeg" else ext
    mime_ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif"}
    return mime_ext.get(content_type.split(";")[0].strip().lower())


def download(url):
    name_hash = hashlib.sha256(url.encode("utf-8")).hexdigest()
    for attempt in range(4):
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; ProductImageArchiver/1.0)"})
            with urlopen(request, timeout=30) as response:
                content_type = response.headers.get("Content-Type", "")
                ext = image_extension(url, content_type)
                if not ext or not content_type.lower().startswith("image/"):
                    return url, "", f"not an image ({content_type})"
                data = response.read(15 * 1024 * 1024 + 1)
                if len(data) > 15 * 1024 * 1024:
                    return url, "", "image exceeds 15 MiB limit"
                dest = IMAGE_DIR / f"{name_hash}{ext}"
                tmp = dest.with_suffix(dest.suffix + ".part")
                tmp.write_bytes(data)
                tmp.replace(dest)
                return url, f"catalog/{dest.name}", ""
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            if attempt == 3:
                return url, "", str(exc)[:240]
            time.sleep(1.5 * (attempt + 1))


def apply_mapping(rows):
    with MANIFEST.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["source_url", "local_path", "error"])
        writer.writerows(rows)
    succeeded = sum(bool(local_path) for _, local_path, _ in rows)
    if not succeeded:
        return 0
    with MAPPING_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["source_url", "local_path"])
        writer.writerows((url, local_path) for url, local_path, error in rows if local_path)

    # Use psql's client-side COPY to load a temporary map, then update all matching products.
    script = f"""BEGIN;
CREATE TEMP TABLE image_map (source_url text PRIMARY KEY, local_path text NOT NULL);
\\copy image_map FROM '{MAPPING_CSV}' WITH (FORMAT csv, HEADER true);
UPDATE public.products p SET image=m.local_path FROM image_map m WHERE p.image=m.source_url;
COMMIT;
SELECT COUNT(*) FROM public.products WHERE image LIKE 'catalog/%';
"""
    result = subprocess.run(psql_args(), input=script, check=True, text=True, capture_output=True)
    return int(result.stdout.strip().splitlines()[-1])


def main():
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    urls = read_urls()
    print(f"Distinct image URLs: {len(urls)}", flush=True)
    rows = []
    with ThreadPoolExecutor(max_workers=24) as pool:
        futures = [pool.submit(download, url) for url in urls]
        for index, future in enumerate(as_completed(futures), 1):
            rows.append(future.result())
            if index % 250 == 0 or index == len(futures):
                successes = sum(bool(local_path) for _, local_path, _ in rows)
                print(f"Processed {index}/{len(futures)}; downloaded {successes}; failed {index - successes}", flush=True)
    rows.sort(key=lambda row: row[0])
    updated = apply_mapping(rows)
    failed = [(url, error) for url, local, error in rows if not local]
    print(f"Updated product rows to local image paths: {updated}")
    print(f"Failed distinct URLs: {len(failed)}")
    print(f"Manifest: {MANIFEST}")
    if failed:
        failures_file = MANIFEST.with_name("product-image-download-failures.csv")
        with failures_file.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["source_url", "error"])
            writer.writerows(failed)
        print(f"Failure details: {failures_file}")


if __name__ == "__main__":
    main()
