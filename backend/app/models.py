from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    business_profiles: Mapped[list["BusinessProfile"]] = relationship(back_populates="user")


class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    kbli_code: Mapped[str | None] = mapped_column(String(5))
    risk_tier: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="business_profiles")
    generated_documents: Mapped[list["GeneratedDocument"]] = relationship(back_populates="business_profile")


class Obligation(Base):
    """Mirrors data/TEMPLATE_obligations.csv (see data/README.md for the fill-in rules)."""

    __tablename__ = "obligations"

    id: Mapped[int] = mapped_column(primary_key=True)
    obligation_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    track: Mapped[str] = mapped_column(String(10), nullable=False)
    kbli_scope: Mapped[str] = mapped_column(Text, nullable=False)
    business_scale: Mapped[str] = mapped_column(Text, nullable=False)
    risk_tier: Mapped[str | None] = mapped_column(String(50))
    requirement_text: Mapped[str] = mapped_column(Text, nullable=False)
    issuing_agency: Mapped[str] = mapped_column(String(255), nullable=False)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    source_article: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)


class RegulationChunk(Base):
    __tablename__ = "regulation_chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_profile_id: Mapped[int] = mapped_column(ForeignKey("business_profiles.id"), nullable=False)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    business_profile: Mapped["BusinessProfile"] = relationship(back_populates="generated_documents")
