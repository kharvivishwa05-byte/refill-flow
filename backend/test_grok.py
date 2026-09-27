import asyncio
from services.ai_service import analyze_refill_message
async def main():
    message = (
        "The patient requested a Metformin renewal. "
        "No refills remain. Provider authorization is required."
    )
    result = await analyze_refill_message(message)
    print(result)
if __name__ == "__main__":
    asyncio.run(main())