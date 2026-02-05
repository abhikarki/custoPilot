import asyncio
import sys
import re
sys.path.insert(0, '.')

from sqlalchemy import select
from app.db.session import async_session_maker, init_db
from app.db.models import User, UserRole, Organization
from app.core.security import get_password_hash


def create_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug


async def seed_admin(
    email: str = "admin@custopilot.com",
    password: str = "admin123",
    full_name: str = "Admin User",
    org_name: str = "CustoPilot Demo"
):
    await init_db()
    
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"Admin user {email} already exists!")
            return
        
        org = Organization(
            name=org_name,
            slug=create_slug(org_name),
            settings={},
            is_active=True,
        )
        db.add(org)
        await db.flush() 
        
        admin = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=UserRole.ADMIN,
            organization_id=org.id,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        
        print("✅ Admin user created successfully!")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   Organization: {org_name}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Seed admin user')
    parser.add_argument('--email', default='admin@custopilot.com', help='Admin email')
    parser.add_argument('--password', default='admin123', help='Admin password')
    parser.add_argument('--name', default='Admin User', help='Admin full name')
    parser.add_argument('--org', default='CustoPilot Demo', help='Organization name')
    
    args = parser.parse_args()
    asyncio.run(seed_admin(args.email, args.password, args.name, args.org))
