"""
Postcard processing service for Stannp submission and postcard back generation
"""
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.schemas import StannpSubmissionRequest, PostcardRequest


async def submit_to_stannp(request: StannpSubmissionRequest, db: Session) -> Dict[str, Any]:
    """Submit postcard to Stannp for printing and mailing"""
    # TODO: Extract Stannp submission logic from main.py
    pass


async def generate_postcard_back(request: PostcardRequest) -> Dict[str, Any]:
    """Generate postcard back only"""
    # TODO: Extract postcard back generation logic from main.py
    pass