import os
import httpx
from typing import Dict, Any

async def generate_outreach_copy(lead_details: Dict[str, Any], channel: str) -> str:
    """
    Generates personalized outreach content (WhatsApp message, Email, or RM Call Script)
    based on the lead's profile, eligible amount, and specific intent triggers.
    
    If GEMINI_API_KEY is available in the environment, it uses the Gemini 1.5 Flash API.
    Otherwise, it falls back to a highly polished local rules-based templates engine.
    """
    customer_name = lead_details["customer_name"]
    loan_type = lead_details["loan_type"]
    eligible_amount = lead_details["eligible_loan_amount"]
    max_emi = lead_details["max_eligible_emi"]
    interest_rate = lead_details["interest_rate"]
    tenure_months = lead_details["tenure_months"]
    triggers = lead_details.get("triggers", [])
    
    # Construct context string for the prompt or local template
    trigger_context = "showing recent interest in our services"
    if triggers:
        trigger_context = ", ".join(triggers)

    # 1. Check for Gemini API key
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        prompt = f"""
        You are an expert Relationship Manager at IDBI Bank.
        Generate a highly personalized outreach message for a client.
        
        Client Details:
        - Name: {customer_name}
        - Target Product: {loan_type}
        - Pre-Approved Eligible Loan Limit: INR {eligible_amount:,.2f}
        - Estimated Interest Rate: {interest_rate}% p.a.
        - Flexible Tenure Options: Up to {tenure_months} months
        - Key Triggers: {trigger_context}
        
        Output Format Required: {channel.upper()}
        Channels Guidelines:
        - WHATSAPP: Keep it friendly, short, conversational, use emojis, include a clear call-to-action (CTA). Max 120 words.
        - EMAIL: Professional subject line, structured body, emphasize pre-approved limit and ease of digital application, warm sign-off.
        - CALL_SCRIPT: A conversational script for the Relationship Manager. Include: Greeting, Opening Hook (mentioning the pre-approved offer), Handling Potential Objections, and Closing Call-to-action (booking a meeting or sending details on WhatsApp).
        
        Generate only the final message content, no conversational meta-text.
        """
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return text.strip()
        except Exception as e:
            # Fallback to local on connection errors
            pass

    # 2. Local fallback templates engine
    if channel.lower() == "whatsapp":
        return f"""👋 Hello {customer_name}! 

We noticed you've been looking into {loan_type} options recently. Based on your relationship with IDBI Bank, we have great news! 

🎉 You are pre-approved for an **IDBI Super Loan** up to **INR {eligible_amount:,.0f}** at just **{interest_rate}% interest**!
💼 Monthly EMIs start from only **INR {max_emi:,.0f}**.

It is a 100% digital process with zero paperwork. Tap the link below to get credited instantly or reply 'YES' to schedule a callback.

👉 [idbi.co/instant-apply](https://example.com)
*IDBI Bank: Banking on Trust.*"""

    elif channel.lower() == "email":
        return f"""Subject: Pre-Approved {loan_type} Offer: Up to INR {eligible_amount:,.0f} from IDBI Bank

Dear {customer_name},

Thank you for choosing IDBI Bank as your trusted financial partner. 

We recently noticed your interest in our {loan_type} calculator and product offerings. Based on your healthy transaction record and account relationship with us, we are delighted to offer you a pre-approved digital {loan_type} limit:

*   **Pre-Approved Loan Amount:** INR {eligible_amount:,.0f}
*   **Special Interest Rate:** {interest_rate}% p.a.
*   **Tenure Option:** Up to {tenure_months} months
*   **Estimated Monthly EMI:** INR {max_emi:,.0f}

This offer requires zero physical documents and can be completed entirely online in under 5 minutes. 

To claim this pre-approved limit, simply click the button below to log in to your IDBI Go Mobile+ app:
[Apply Digitally Now](https://example.com)

If you would prefer to speak with a dedicated lending specialist to customize your terms, please reply to this email or call us directly at 1800-209-4324.

Warm regards,

Relationship Management Team
IDBI Bank Ltd."""

    elif channel.lower() == "call_script":
        return f"""[Relationship Manager Call Script]

RM: "Good morning/afternoon, am I speaking with {customer_name}?"
Client: "Yes, speaking."

RM: "Hello {customer_name}, my name is [RM Name] calling from IDBI Bank's Privilege Relations. I hope you are having a wonderful day!
I am calling because you are one of our select customers pre-qualified for our Instant Digital {loan_type} based on your healthy banking record with us. 

We have pre-approved a loan limit of up to INR {eligible_amount:,.0f} for you, at a highly competitive rate of {interest_rate}% per annum.

I noticed you were checking out some of our loan calculations recently, so I wanted to reach out and see if you are actively planning a purchase? We can disburse this amount to your account today with zero paperwork."

[Objection Handling - If client is busy/hesitant]:
RM: "No problem at all! I understand you are busy. I can quickly send you the pre-approved terms, including your monthly EMI of INR {max_emi:,.0f}, over WhatsApp so you can review it at your convenience. Is this mobile number active on WhatsApp?"

[Closing/CTA]:
RM: "Great, I've sent the details. I will follow up tomorrow to see if you have any questions, or we can get the application processed. Thank you so much for your time, {customer_name}, have a great day!" """

    else:
        return f"Outreach for {customer_name} via {channel}. Pre-approved for {loan_type} up to INR {eligible_amount:,.0f}."
