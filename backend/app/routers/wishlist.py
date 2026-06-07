import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.wishlist import AddWishlistRequest, WishlistResponse, WishlistItemResponse
from app.services import wishlist_service
from app.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("/", response_model=WishlistResponse)
async def get_wishlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await wishlist_service.get_wishlist(db, current_user.id)
    return WishlistResponse(items=items, total=len(items))


@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    body: AddWishlistRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await wishlist_service.add_to_wishlist(db, current_user.id, body.product_id)
    return {"message": "Added to wishlist"}


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await wishlist_service.remove_from_wishlist(db, current_user.id, product_id)
