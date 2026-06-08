import io
import uuid
import filetype
import boto3
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException, UploadFile, status
from app.config import get_settings

settings = get_settings()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_IMAGE_EDGE = 1600
# Guard against decompression bombs — reject images > 25 MP
Image.MAX_IMAGE_PIXELS = 25_000_000


def _get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )


async def _read_and_prepare_image(file: UploadFile) -> io.BytesIO:
    raw = await file.read()

    if len(raw) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 5 MB limit")

    kind = filetype.guess(raw)
    if kind is None or kind.mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only JPG, PNG, WebP accepted")

    try:
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    except (UnidentifiedImageError, Exception) as e:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Invalid image file") from e

    if max(img.size) > MAX_IMAGE_EDGE:
        img.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE), Image.LANCZOS)

    output = io.BytesIO()
    img.save(output, format="WEBP", quality=85)
    output.seek(0)
    return output


async def upload_product_image(file: UploadFile, product_id: uuid.UUID, position: int) -> str:
    output = await _read_and_prepare_image(file)
    key = f"products/{product_id}/{position}.webp"
    await _upload_webp(output, key)
    return f"{settings.r2_public_url}/{key}"


async def upload_site_image(file: UploadFile, image_key: str) -> str:
    output = await _read_and_prepare_image(file)
    key = f"site/{image_key}.webp"
    await _upload_webp(output, key)
    return f"{settings.r2_public_url}/{key}"


async def _upload_webp(output: io.BytesIO, key: str) -> None:
    s3 = _get_s3_client()
    s3.upload_fileobj(
        output,
        settings.r2_bucket_name,
        key,
        ExtraArgs={"ContentType": "image/webp", "CacheControl": "public, max-age=31536000"},
    )


async def delete_product_image(product_id: uuid.UUID, position: int) -> None:
    key = f"products/{product_id}/{position}.webp"
    s3 = _get_s3_client()
    s3.delete_object(Bucket=settings.r2_bucket_name, Key=key)
