"""
PathPilot AI – Career Mentor Engine (Phase 7 — v2)

A conversational AI career mentor that gives rich, natural, mentor-like
responses — not database dumps. Uses the existing knowledge base plus an
extensive inline knowledge layer for exams, career details and guidance.

Intent detection order matters:
  exam_guidance is checked BEFORE career_detail so "what is UPSC" routes correctly.

Intent categories:
  - greeting       : hi, hello, hey …
  - career_advice  : recommend, best career, what career …
  - skill_gap      : skill gap, what skills do I need …
  - roadmap        : roadmap, learning path, how to become …
  - exam_guidance  : upsc, ssc, pcs, gate, banking, railway … (checked before career_detail)
  - profile_tips   : improve profile, cgpa, certifications …
  - career_detail  : tell me about [career], what is [career] …
  - fallback       : anything else — tries to be helpful anyway
"""
from __future__ import annotations

import random
import re
from dataclasses import dataclass, field
from typing import Any

from app.ml.recommender import get_knowledge_base


# ─────────────────────────────────────────────────────────────────── #
# User context                                                         #
# ─────────────────────────────────────────────────────────────────── #
@dataclass
class UserContext:
    """Snapshot of the current user's profile and recommendations."""
    name: str = "there"
    skills: list[str] = field(default_factory=list)
    interests: list[str] = field(default_factory=list)
    cgpa: float | None = None
    certifications: list[str] = field(default_factory=list)
    career_goals: str = ""
    top_careers: list[dict[str, Any]] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────── #
# Rich knowledge base (inline — no external API)                       #
# ─────────────────────────────────────────────────────────────────── #
_EXAM_KNOWLEDGE: dict[str, str] = {
    "upsc": (
        "The UPSC Civil Services Exam is arguably the toughest and most prestigious exam in India. "
        "It's your gateway to becoming an IAS, IPS, or IFS officer.\n\n"
        "The journey is intense—you'll need to clear the Prelims (objective), the Mains (9 descriptive papers), "
        "and finally the Personality Test. Most successful candidates dedicate at least 1 to 2 years of focused study, "
        "especially on Current Affairs and standard books like Laxmikanth for Polity.\n\n"
        "It's a challenging path, but the impact you can make as a civil servant is unmatched. "
        "Are you currently in college, or are you already working?"
    ),
    "pcs": (
        "State PCS exams are conducted by each state (like UPPSC, BPSC, or MPSC) to recruit senior state-level officers like Deputy Collectors and DSPs. "
        "They are extremely prestigious within the state.\n\n"
        "The exam pattern is very similar to UPSC (Prelims, Mains, Interview), but the catch is you really need to know the specific history, geography, and economy of that state. "
        "Many UPSC aspirants take their home state's PCS exam as a strong backup option.\n\n"
        "Which state are you from? I might be able to give you more specific advice on your local PSC."
    ),
    "ssc": (
        "SSC exams are a fantastic route if you're looking for stable central government employment. "
        "If you're a graduate, the **SSC CGL** is the big one—it recruits for roles like Income Tax Inspector and Assistant Section Officer.\n\n"
        "If you're a 12th pass, you can aim for **SSC CHSL** (for clerks and data entry operators). "
        "The preparation for these exams heavily tests your speed and accuracy in Quant, English, Reasoning, and General Awareness.\n\n"
        "Starting salaries range from around ₹18,000 for entry roles up to over ₹1 Lakh for top CGL posts. "
        "Does a central government desk job sound like what you're looking for?"
    ),
    "gate": (
        "GATE is the gold standard exam for engineering and science graduates in India. "
        "It opens two massive doors: getting into top M.Tech programs at IITs/NITs, or securing a high-paying job at a PSU (Public Sector Undertaking) like ONGC, BHEL, or NTPC.\n\n"
        "The exam is heavily focused on your core technical subjects, along with some Engineering Math and Aptitude. "
        "PSU salaries for GATE qualifiers are excellent, often starting around ₹15-20 Lakhs per annum with incredible perks.\n\n"
        "What was your engineering branch? I can tell you how competitive GATE is for your specific field."
    ),
    "banking": (
        "Banking exams like **IBPS PO** and **SBI PO** are incredibly popular because the recruitment cycle is fast and transparent. "
        "You can go from filling out the form to sitting in a bank as a Probationary Officer within 6-8 months.\n\n"
        "The preparation requires serious speed. You'll need to master Quantitative Aptitude, Reasoning, and English, plus Banking Awareness for the Mains. "
        "Starting salaries for POs are generally around ₹40,000 to ₹60,000 per month, and the promotions can eventually take you to top management.\n\n"
        "Are you good with numbers and working under tight time limits?"
    ),
    "railway": (
        "Indian Railways conducts massive recruitment drives through the RRB exams. "
        "The **RRB NTPC** is very popular for graduates looking for non-technical roles like Station Master or Commercial Apprentice, while the **RRB JE** is for engineering diploma and degree holders.\n\n"
        "Railway jobs are famous for their unmatched job security, free travel passes, and excellent medical benefits. "
        "The syllabus is quite similar to SSC exams, focusing heavily on Math, Reasoning, and General Science."
    ),
    "defence": (
        "A career in the Armed Forces is one of the most respected paths you can choose. "
        "If you're just out of 12th grade, you can try for **NDA**. If you're a graduate, the **CDS** or **AFCAT** exams are your gateway to becoming a Commissioned Officer.\n\n"
        "Clearing the written exam is just step one—the real test is the 5-day SSB Interview, which thoroughly assesses your psychology, leadership qualities, and physical fitness.\n\n"
        "It's a life of adventure and purpose. Are you looking to join the Army, Navy, or Air Force?"
    ),
    "neet": (
        "NEET is the single gateway to medical colleges (MBBS, BDS, etc.) across India. "
        "It's intensely competitive—you're competing with over 20 lakh students for a limited number of seats.\n\n"
        "Your preparation needs to be entirely focused on the NCERT syllabus for Biology, Physics, and Chemistry. "
        "Biology makes up 50% of the paper, so absolute mastery of the NCERT Biology textbooks is non-negotiable.\n\n"
        "Are you currently preparing for NEET, or just considering your options?"
    ),
}

_CAREER_EXTENDED_KNOWLEDGE: dict[str, dict[str, str]] = {
    "software developer": {
        "day_in_life": "A typical day involves morning standups, reviewing code PRs, writing new features, debugging, and late-afternoon code reviews. Remote work is widely available.",
        "market": "Software development is one of the fastest-growing fields globally. India alone produces 1.5 million software graduates per year, but good developers are always in demand.",
        "entry_salary": "₹4–8 LPA fresher at Indian startups/IT firms; ₹12–25 LPA at product companies like Zomato, Paytm; $80K–$150K+ at US-based companies.",
        "top_companies": "Google, Microsoft, Amazon, Infosys, TCS, Flipkart, Razorpay, Zomato, Swiggy, CRED",
        "growth": "Junior Dev → Senior Dev → Tech Lead → Engineering Manager or Staff Engineer → Principal/Distinguished Engineer",
    },
    "data scientist / ml engineer": {
        "day_in_life": "A mix of data wrangling (50–60% of time), model building, evaluation, and presenting insights to business stakeholders. Requires both technical depth and communication skills.",
        "market": "AI/ML is the hottest field right now. Global ML engineer demand is growing at 40% year-over-year. In India, companies like Flipkart, PhonePe, and every MNC have active ML teams.",
        "entry_salary": "₹6–12 LPA fresher; ₹20–40 LPA at FAANG/top product; Research roles at IITs/IISc/Google Brain can reach ₹60–80 LPA.",
        "top_companies": "Google DeepMind, OpenAI, Meta AI, Nvidia, Microsoft, IBM Research, Flipkart, Razorpay, CRED, Mu Sigma",
        "growth": "Junior Data Scientist → Data Scientist → Senior DS → Principal DS → Head of AI/ML",
    },
    "data analyst": {
        "day_in_life": "Working with SQL, Excel, Tableau/Power BI to answer business questions. Building dashboards, running A/B test analyses, and presenting findings to product/business teams.",
        "market": "Every company with data needs analysts. It's an accessible entry into the data space — less coding-heavy than Data Science, but highly valued.",
        "entry_salary": "₹3.5–7 LPA fresher; ₹10–18 LPA at mature companies.",
        "top_companies": "McKinsey, BCG, Deloitte, Goldman Sachs, Amazon, Meesho, ShareChat",
        "growth": "Junior Analyst → Analyst → Senior Analyst → Analytics Manager → Head of Analytics",
    },
    "finance & accounting": {
        "day_in_life": "Preparing financial statements, managing budgets, tax filings, audit support, investment analysis, or working in investment banking. The work is structured and deadline-driven.",
        "market": "Finance is evergreen — every business needs financial expertise. CA, CFA, and CPA certifications dramatically boost earning potential.",
        "entry_salary": "₹3–6 LPA for B.Com/MBA Finance freshers; ₹12–25 LPA for CA/CFA qualified; Investment Banking analysts at Big 4 can earn ₹20–35 LPA.",
        "top_companies": "Big 4 (Deloitte, EY, KPMG, PwC), Goldman Sachs, Morgan Stanley, JP Morgan, ICICI, HDFC",
        "growth": "Junior Accountant → Accountant → Finance Manager → CFO",
    },
    "management & operations": {
        "day_in_life": "Leading teams, setting OKRs, running sprint reviews, coordinating across departments, resolving escalations. High visibility, high responsibility.",
        "market": "MBA from IIMs opens doors to consulting, investment banking, and leadership roles. Product Management is one of the most sought-after roles at tech companies.",
        "entry_salary": "₹8–15 LPA post-MBA from tier-2 colleges; ₹20–35 LPA from IIMs.",
        "top_companies": "McKinsey, BCG, Bain, Google, Amazon, Uber, Ola, Zomato",
        "growth": "Associate → Manager → Senior Manager → Director → VP → C-Suite",
    },
    "core engineering": {
        "day_in_life": "Working on CAD software, site inspections, thermodynamics simulations, testing materials, and coordinating with manufacturing teams.",
        "market": "India is seeing a huge push in manufacturing and infrastructure. Roles in EV (Electric Vehicles), renewable energy, and semiconductor design are booming.",
        "entry_salary": "₹3.5–6 LPA fresher; PSU jobs via GATE pay ₹10–18 LPA; Senior engineers at top manufacturing firms can earn ₹25–40 LPA.",
        "top_companies": "L&T, Tata Motors, Mahindra, Siemens, GE, BHEL, ONGC",
        "growth": "Graduate Engineer Trainee → Design/Site Engineer → Project Manager → Plant Head",
    },
    "sales & marketing": {
        "day_in_life": "Pitching to clients, managing social media campaigns, running SEO analysis, negotiating contracts, and tracking conversion funnels.",
        "market": "Every company needs to sell. Digital marketing and B2B SaaS sales are extremely lucrative. Tech sales (pre-sales engineering) pays almost as much as software development.",
        "entry_salary": "₹3–6 LPA (plus high commissions) fresher; ₹12–20 LPA for digital marketing leads.",
        "top_companies": "HUL, P&G, Salesforce, Freshworks, Zoho, Meta, Google",
        "growth": "Sales Executive → Account Executive → Regional Manager → VP of Sales / CMO",
    },
    "education & teaching": {
        "day_in_life": "Preparing lesson plans, delivering lectures, grading assignments, mentoring students, and staying updated with the latest academic developments.",
        "market": "EdTech has revolutionized this space. Beyond traditional schools and universities, online instruction and curriculum design are massive industries.",
        "entry_salary": "₹3–5 LPA at schools; ₹6–10 LPA for Assistant Professors (with NET/PhD); ₹10–25 LPA at top EdTechs.",
        "top_companies": "PhysicsWallah, Unacademy, BYJU'S, top universities (IITs, Ashoka), international schools",
        "growth": "Teacher/Lecturer → Senior Professor / Head of Dept → Principal / Dean",
    },
    "research & science": {
        "day_in_life": "Conducting experiments, reading research papers, writing grants, publishing findings, and running deep analytical models in a lab or field setting.",
        "market": "Driven by government funding and corporate R&D. Fields like biotechnology, space tech (ISRO), and materials science are highly respected.",
        "entry_salary": "₹4–7 LPA (JRF/SRF fellowships); ₹10–15 LPA entry-level scientist.",
        "top_companies": "ISRO, DRDO, CSIR Labs, Biocon, Sun Pharma, Serum Institute",
        "growth": "Research Assistant → Scientist C/D → Principal Investigator → Lab Director",
    },
}


# ─────────────────────────────────────────────────────────────────── #
# Intent patterns (ORDER MATTERS — exam before career_detail)          #
# ─────────────────────────────────────────────────────────────────── #
_INTENT_PATTERNS: list[tuple[str, str]] = [
    (r"\b(hi|hello|hey|good (morning|afternoon|evening|night)|howdy|greetings|sup|what'?s up|yo)\b",
     "greeting"),
    (r"\b(what career|best career|recommend (me )?(a )?career|career for me|career suit|career match|"
     r"which career|career option|career suggest|what (should|can) i (do|become|pursue)|"
     r"suitable career|right career|right field|field for me)\b",
     "career_advice"),
    (r"\b(skill gap|missing skill|skills? (i |do i )?(need|lack|require|miss)|"
     r"which skill|gap analysis|skills? to (learn|develop|build|acquire)|what (skills?|am i missing)|"
     r"skills? (am|are) (i|we) missing|what (do i|should i) learn)\b",
     "skill_gap"),
    (r"\b(roadmap|learning path|how to (become|learn|get into|start|enter)|study plan|"
     r"step(s)? (to|for)|path to|guide to|plan for|curriculum|course plan|how do i start)\b",
     "roadmap"),
    # ── EXAM patterns BEFORE career_detail ──────────────────────── #
    (r"\b(exam[s]?|upsc|ias|ips|ifs|civil service|state pcs|state service|pcs|uppsc|bpsc|mppsc|rpsc|"
     r"mpsc|kpsc|ras|kas|psc|ssc|cgl|chsl|mts|cpo|gate|ibps|sbi po|sbi clerk|rbi grade|"
     r"rbi officer|banking exam|bank (po|clerk|officer)|rrb|ntpc|railway exam|railway job|"
     r"defence exam|nda|cds|afcat|ssb|neet|jee|cat exam|government (job|exam|service)|"
     r"competitive exam|entrance exam|public service)\b",
     "exam_guidance"),
    (r"\b(improv(e|ing) (my )?profile|profile tip|how (to )?(improve|update|complete) (my )?profile|"
     r"cgpa|certif|what to add (to)?|make (my )?profile better|profile (help|score|health|strength)|"
     r"profile (look|seem)|increase (my )?match)\b",
     "profile_tips"),
    (r"\b(tell me about|what is|explain|describe|information (on|about)|"
     r"details (on|about)|overview of|what does .{3,50} do|about .{3,50} career|"
     r"career (in|as)|what('s| is) (it like|the scope))\b",
     "career_detail"),
    (r"\b(thanks|thankyou|thank you|thank|appreciate|awesome|great|cool|ok|okay|got it|sounds good|perfect|thx|tysm|ty|nice)\b",
     "gratitude"),
]

# Conversational openers to vary mentor responses
_GREET_OPENERS = [
    "Hey {name}! Great to connect.",
    "Hi {name}! I'm here and ready to help.",
    "Hello {name}! Good to see you.",
]

_ADVICE_OPENERS = [
    "Based on everything I know about your profile,",
    "Looking at your skills and interests,",
    "After analysing your background,",
]


def _detect_intent(message: str, last_bot_msg: str | None = None) -> str:
    text = message.lower().strip()
    
    # Context-aware follow-ups
    if last_bot_msg and len(text) < 15:
        if "yes" in text or "sure" in text or "yeah" in text or "please" in text:
            last_lower = last_bot_msg.lower()
            if "learning roadmap" in last_lower or "roadmap" in last_lower:
                return "roadmap"
            if "skill gap" in last_lower or "missing skills" in last_lower:
                return "skill_gap"
                
    for pattern, intent in _INTENT_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return intent
    return "fallback"


def _extract_career_name(message: str, kb_career_names: list[str]) -> str | None:
    msg_lower = message.lower()
    
    # Check if the message matches a career name exactly or with minor words like "tell me about"
    # To handle "data science" naturally mapping to "Data Scientist / ML Engineer"
    if "data science" in msg_lower or "machine learning" in msg_lower:
        return "Data Scientist / ML Engineer"
        
    # Sort by length desc to prefer longer matches
    for name in sorted(kb_career_names, key=len, reverse=True):
        if name.lower() in msg_lower:
            return name
            
    # Substring matching for single words if nothing else worked
    if "software" in msg_lower or "developer" in msg_lower:
        return "Software Developer"
    if "data" in msg_lower and "analyst" in msg_lower:
        return "Data Analyst"
    if "sales" in msg_lower or "marketing" in msg_lower:
        return "Sales & Marketing"
        
    return None


def _extract_exam_key(message: str) -> str:
    """Detect which exam topic to respond to."""
    msg = message.lower()
    if re.search(r"\b(upsc|ias|ips|ifs|civil service)\b", msg):
        return "upsc"
    if re.search(r"\b(state pcs|pcs|uppsc|bpsc|mppsc|rpsc|mpsc|kpsc|ras|kas|state service|provincial)\b", msg):
        return "pcs"
    if re.search(r"\b(ssc|cgl|chsl|mts|cpo|staff selection)\b", msg):
        return "ssc"
    if re.search(r"\b(gate|iit|nit|m\.?tech|psu|ongc|bhel|ntpc|iocl)\b", msg):
        return "gate"
    if re.search(r"\b(bank|ibps|sbi|rbi|banking|clerk|po )\b", msg):
        return "banking"
    if re.search(r"\b(railway|rrb|ntpc|loco pilot|alp|group d)\b", msg):
        return "railway"
    if re.search(r"\b(defence|nda|cds|afcat|ssb|army|navy|air force|military)\b", msg):
        return "defence"
    if re.search(r"\b(neet|mbbs|medical|doctor|bds|ayush)\b", msg):
        return "neet"
    return "overview"


# ─────────────────────────────────────────────────────────────────── #
# Mentor                                                               #
# ─────────────────────────────────────────────────────────────────── #
class CareerMentor:
    SUGGESTED_PROMPTS = [
        "What career suits me best?",
        "What skills am I missing for my top career?",
        "Show me my learning roadmap",
        "Tell me about Data Scientist / ML Engineer",
        "What is State PCS?",
        "How can I improve my profile?",
    ]

    def __init__(self) -> None:
        self._kb = get_knowledge_base()
        self._kb_careers = self._kb.all_careers()
        self._kb_names = [c["career_name"] for c in self._kb_careers]

    def respond(self, message: str, ctx: UserContext, last_bot_msg: str | None = None) -> str:
        # Check if Gemini API can be used
        try:
            from app.db.session import SessionLocal
            from app.models.settings import SystemSettings
            from sqlalchemy import select

            with SessionLocal() as db:
                settings = db.scalar(select(SystemSettings))

            if settings and settings.ai_provider == "gemini" and settings.gemini_api_key:
                import google.generativeai as genai
                
                genai.configure(api_key=settings.gemini_api_key)
                
                top_careers_str = "None calculated yet"
                if ctx.top_careers:
                    top_careers_str = ", ".join([f"{c['career_name']} ({c.get('match_pct', 0):.0f}% match)" for c in ctx.top_careers])
                
                system_instruction = (
                    f"You are the PathPilot AI Career Mentor. Your goal is to guide the student with personalized, "
                    f"encouraging, and structured career advice. Do not output database dumps; instead, talk like a real, "
                    f"experienced mentor.\n\n"
                    f"Student Context:\n"
                    f"- Name: {ctx.name}\n"
                    f"- Profile Skills: {', '.join(ctx.skills) if ctx.skills else 'None listed'}\n"
                    f"- Profile Interests: {', '.join(ctx.interests) if ctx.interests else 'None listed'}\n"
                    f"- CGPA: {ctx.cgpa if ctx.cgpa else 'Not provided'}\n"
                    f"- Certifications: {', '.join(ctx.certifications) if ctx.certifications else 'None listed'}\n"
                    f"- Career Goals: {ctx.career_goals if ctx.career_goals else 'Not provided'}\n"
                    f"- Top Career Matches: {top_careers_str}\n\n"
                    f"Core Persona & System Guidelines:\n"
                    f"{settings.ai_system_prompt}"
                )

                model = genai.GenerativeModel(
                    model_name=settings.ai_model or "gemini-1.5-flash",
                    generation_config={
                        "temperature": float(settings.ai_temperature),
                    },
                    system_instruction=system_instruction
                )

                # Format prompts with previous context if available
                prompt = ""
                if last_bot_msg:
                    prompt += f"Mentor: {last_bot_msg}\nStudent: {message}"
                else:
                    prompt = message
                    
                response = model.generate_content(prompt)
                return response.text.strip()
        except Exception as e:
            import logging
            logging.warning(f"Gemini AI Mentor call failed: {e}. Falling back to rule-based engine.")

        intent = _detect_intent(message, last_bot_msg)
        if intent == "greeting":
            return self._greeting(message, ctx)
        elif intent == "career_advice":
            return self._career_advice(message, ctx)
        elif intent == "skill_gap":
            return self._skill_gap(message, ctx, last_bot_msg)
        elif intent == "roadmap":
            return self._roadmap(message, ctx, last_bot_msg)
        elif intent == "exam_guidance":
            return self._exam_guidance(message, ctx)
        elif intent == "profile_tips":
            return self._profile_tips(message, ctx)
        elif intent == "career_detail":
            return self._career_detail(message, ctx)
        elif intent == "gratitude":
            return self._gratitude(message, ctx)
        else:
            return self._fallback(message, ctx)

    # ── Greeting ──────────────────────────────────────────────────── #
    def _greeting(self, message: str, ctx: UserContext) -> str:
        first_name = ctx.name.split()[0] if ctx.name not in ("", "there") else "there"
        opener = random.choice(_GREET_OPENERS).format(name=first_name)
        skill_count = len(ctx.skills)

        if ctx.top_careers:
            top = ctx.top_careers[0]["career_name"]
            pct = round(ctx.top_careers[0].get("match_pct", 0))
            context_line = (
                f"I see your top career match right now is **{top}** ({pct}% compatibility). "
            )
        else:
            context_line = ""

        if skill_count == 0:
            nudge = (
                "I noticed your profile doesn't have any skills listed yet. "
                "Adding a few skills in your **Profile** will help me give you much better advice!"
            )
        elif skill_count < 4:
            nudge = "Adding a few more skills to your profile will significantly sharpen your career matches."
        else:
            nudge = ""

        # Build a natural conversational response
        parts = [opener]
        if context_line or nudge:
            parts.append(f"{context_line}{nudge}")
            
        parts.append(
            "I'm here to help you figure out your next steps. "
            "You can ask me things like:\n"
            "> *\"What career suits me best?\"*\n"
            "> *\"Show me a roadmap for Data Scientist\"*\n"
            "> *\"Tell me about UPSC exams\"*"
        )

        return "\n\n".join(parts)

    # ── Gratitude / Acknowledgment ────────────────────────────────── #
    def _gratitude(self, message: str, ctx: UserContext) -> str:
        first_name = ctx.name.split()[0] if ctx.name not in ("", "there") else "there"
        responses = [
            f"You're very welcome, {first_name}! Let me know if you need anything else.",
            f"Happy to help, {first_name}! I'm always here when you need career guidance.",
            f"Awesome! Reach out whenever you're ready for the next step.",
            f"Glad I could help! Is there any other career or skill you'd like to explore?",
            f"You got it, {first_name}. Best of luck, and just ping me if you need another roadmap!"
        ]
        return random.choice(responses)

    # ── Career advice ─────────────────────────────────────────────── #
    def _career_advice(self, message: str, ctx: UserContext) -> str:
        first_name = ctx.name.split()[0] if ctx.name not in ("", "there") else "you"
        if not ctx.top_careers:
            return (
                "I'd love to give you personalised recommendations, but I need to run my analysis first. "
                "Head over to your **Dashboard** and click **Refresh matches** — "
                "it only takes a second and uses your profile data to find your best career fits. "
                "Once done, come back and I can walk you through the results!"
            )

        opener = random.choice(_ADVICE_OPENERS)
        top = ctx.top_careers[0]
        top_name = top["career_name"]
        top_pct = round(top.get("match_pct", 0))

        # Extended knowledge for top match
        top_key = top_name.lower()
        ext = _CAREER_EXTENDED_KNOWLEDGE.get(top_key, {})
        market_note = f"\n\n💼 **Market insight:** {ext['market']}" if ext.get("market") else ""
        salary_note = f"\n💰 **Salary range:** {ext['entry_salary']}" if ext.get("entry_salary") else ""

        lines = [
            f"{opener} here's where I think {first_name} stands right now:\n",
        ]

        for i, c in enumerate(ctx.top_careers[:3], 1):
            pct = round(c.get("match_pct", 0))
            bar = "█" * (pct // 10) + "░" * (10 - pct // 10)
            lines.append(
                f"**{i}. {c['career_name']}**\n"
                f"   Match: `{bar}` {pct}%"
            )

        lines.append(
            f"\n**{top_name}** is your strongest match at {top_pct}%. "
            f"This makes sense given your background."
            f"{market_note}{salary_note}\n\n"
            f"Want me to dig deeper? I can show you:\n"
            f"- Your **skill gap** for {top_name} — what's missing and how critical each gap is\n"
            f"- A **learning roadmap** — exactly what to study and in what order\n"
            f"- Or ask me about any other career in the list above"
        )
        return "\n".join(lines)

    # ── Skill gap ─────────────────────────────────────────────────── #
    def _skill_gap(self, message: str, ctx: UserContext, last_bot_msg: str | None = None) -> str:
        career_name = _extract_career_name(message, self._kb_names)
        if not career_name and last_bot_msg:
            career_name = _extract_career_name(last_bot_msg, self._kb_names)
            
        if not career_name:
            if ctx.top_careers:
                career_name = ctx.top_careers[0]["career_name"]
            else:
                return (
                    "To give you a skill gap analysis, I need to know which career you're targeting. "
                    "You haven't run your recommendations yet — pop over to the **Dashboard** first, "
                    "or ask me something like: *What skills do I need for Data Analyst?*"
                )

        gap = self._kb.get_skill_gaps(
            career_name=career_name,
            skills=ctx.skills,
            interests=ctx.interests,
        )
        if "error" in gap:
            return (
                f"Hmm, I couldn't find a career called **{career_name}** in my knowledge base. "
                f"Try one of these: {', '.join(self._kb_names[:6])}."
            )

        you_have = gap.get("you_have", [])
        you_need = gap.get("you_need", [])
        importance = gap.get("skill_importance", {})
        total = gap.get("total_required_skills", 1) or 1
        coverage = round(len(you_have) / total * 100)

        # Classify missing skills by priority
        high = [s for s in you_need if importance.get(s) == "High"][:4]
        medium = [s for s in you_need if importance.get(s) == "Medium"][:3]
        low = [s for s in you_need if importance.get(s) == "Low"][:3]

        if ctx.skills:
            context = (
                f"Looking at your skills ({', '.join(ctx.skills[:3])}{'...' if len(ctx.skills) > 3 else ''})"
                f" vs what **{career_name}** typically requires:\n"
            )
        else:
            context = f"Here's the skill gap breakdown for **{career_name}**:\n"

        result = context

        if coverage >= 70:
            result += f"\n🟢 You're in great shape! You already cover **{coverage}%** of the required skills.\n"
        elif coverage >= 40:
            result += f"\n🟡 You're about **{coverage}% of the way there** — solid foundation, some gaps to close.\n"
        else:
            result += f"\n🔴 You cover **{coverage}%** right now — there's meaningful ground to cover, but totally achievable.\n"

        if you_have:
            result += f"\n✅ **Already have** ({len(you_have)} skills): {', '.join(you_have[:8])}\n"

        if high:
            result += f"\n🔴 **Critical gaps** (learn these first): {', '.join(high)}\n"
        if medium:
            result += f"\n🟡 **Important gaps** (learn these next): {', '.join(medium)}\n"
        if low:
            result += f"\n🟢 **Nice-to-have** (polish later): {', '.join(low)}\n"

        if not you_need:
            result += "\n🎉 Impressive — you've covered all the key skills for this career! You're well positioned."
        else:
            result += f"\nFocus on the critical gaps first. Want me to build you a structured **learning roadmap** to tackle these systematically?"

        return result

    # ── Roadmap ───────────────────────────────────────────────────── #
    def _roadmap(self, message: str, ctx: UserContext, last_bot_msg: str | None = None) -> str:
        career_name = _extract_career_name(message, self._kb_names)
        if not career_name and last_bot_msg:
            career_name = _extract_career_name(last_bot_msg, self._kb_names)
            
        if not career_name:
            if ctx.top_careers:
                career_name = ctx.top_careers[0]["career_name"]
            else:
                return (
                    "Sure! Which career would you like a roadmap for? "
                    "Try something like: *Show me the roadmap for Software Developer*\n\n"
                    "Or visit your **Dashboard** first to get your personalised career matches."
                )

        career_data = next(
            (c for c in self._kb_careers if c["career_name"].lower() == career_name.lower()),
            None,
        )
        if not career_data:
            return f"I couldn't find roadmap data for **{career_name}**. Try one of: {', '.join(self._kb_names[:5])}."

        first_name = ctx.name.split()[0] if ctx.name not in ("", "there") else "you"
        user_skill_set = {s.lower() for s in ctx.skills + ctx.interests}
        stages = career_data.get("learning_roadmap", [])
        ext = _CAREER_EXTENDED_KNOWLEDGE.get(career_name.lower(), {})

        intro = (
            f"Here's a personalised learning roadmap for **{career_name}** "
            f"based on what {first_name} already knows:\n"
        )

        if not stages:
            skills = career_data.get("typical_skills", [])[:12]
            acquired = [s for s in skills if s.lower() in user_skill_set]
            pending = [s for s in skills if s.lower() not in user_skill_set]
            result = intro
            if acquired:
                result += f"\n✅ **Skills you already have:** {', '.join(acquired)}\n"
            if pending:
                result += f"\n📌 **Skills to build:** {', '.join(pending[:10])}\n"
            result += "\nVisit the **Roadmap** page for a fully interactive view!"
            return result

        lines = [intro]
        total_skills = 0
        acquired_count = 0

        for i, stage in enumerate(stages, 1):
            stage_title = stage.get("title", stage.get("stage", f"Stage {i}"))
            stage_skills = stage.get("skills", [])
            acquired = [s for s in stage_skills if s.lower() in user_skill_set]
            pending = [s for s in stage_skills if s.lower() not in user_skill_set]
            total_skills += len(stage_skills)
            acquired_count += len(acquired)

            stage_done = len(acquired) == len(stage_skills) and stage_skills
            status_icon = "✅" if stage_done else ("🔄" if acquired else "⏳")

            lines.append(f"\n**{status_icon} Stage {i}: {stage_title}**")
            if acquired:
                lines.append(f"   ✅ You have: {', '.join(acquired[:5])}")
            if pending:
                lines.append(f"   📌 To learn: {', '.join(pending[:5])}")

        overall_pct = round(acquired_count / total_skills * 100) if total_skills else 0
        lines.append(f"\n**Overall progress: {overall_pct}%** ({acquired_count}/{total_skills} skills)")

        if ext.get("growth"):
            lines.append(f"\n📈 **Career progression:** {ext['growth']}")

        if overall_pct == 100:
            lines.append("\n🎉 You've already mastered this roadmap! You're ready to apply for roles.")
        else:
            lines.append(
                "\nTip: Start from Stage 1 and move forward only when you're comfortable. "
                "Consistency over intensity wins every time. You've got this!"
            )

        return "\n".join(lines)

    # ── Exam guidance ─────────────────────────────────────────────── #
    def _exam_guidance(self, message: str, ctx: UserContext) -> str:
        exam_key = _extract_exam_key(message)
        first_name = ctx.name.split()[0] if ctx.name not in ("", "there") else "you"

        if exam_key == "overview":
            # Generic overview with context from user's background
            skills_context = ""
            if ctx.skills:
                tech_skills = [s for s in ctx.skills if any(t in s.lower() for t in ["python", "java", "c++", "coding", "programming", "engineering"])]
                if tech_skills:
                    skills_context = f"\n\nGiven your technical background ({', '.join(tech_skills[:3])}), **GATE** could be particularly interesting for you — it opens doors to PSU jobs at ONGC, BHEL, NTPC etc. with excellent salaries."

            return (
                f"India has a rich landscape of competitive exams — let me give {first_name} a quick overview:\n\n"
                "**🏛️ Civil Services**\n"
                "- **UPSC CSE** → IAS, IPS, IFS (very high difficulty, ~1 year prep)\n"
                "- **State PCS** → SDM, DSP, BDO at state level (graduate + domicile requirement)\n\n"
                "**💼 Central Govt / PSU**\n"
                "- **SSC CGL** → Inspector, Auditor, ASO posts (graduate level)\n"
                "- **SSC CHSL** → LDC, DEO (12th pass)\n"
                "- **GATE** → PSU jobs + M.Tech at IITs/NITs\n\n"
                "**🏦 Banking**\n"
                "- **IBPS PO / SBI PO** → Bank Officers (₹42,000+/month)\n"
                "- **RBI Grade B** → Most prestigious banking job (₹63,840/month)\n"
                "- **IBPS Clerk / SBI Clerk** → Clerical cadre (easier cutoffs)\n\n"
                "**🚂 Railways**\n"
                "- **RRB NTPC** → Clerk/Traffic/Accounts Assistant\n"
                "- **RRB JE** → Junior Engineer (diploma/B.Tech)\n\n"
                "**⚔️ Defence**\n"
                "- **NDA** (after 12th) → Army, Navy, Air Force\n"
                "- **CDS** (after graduation) → Commissioned Officer\n\n"
                f"{skills_context}\n\n"
                "Which one would you like me to go deep on? Just ask — *What is State PCS?*, *Tell me about GATE*, etc."
            )

        info = _EXAM_KNOWLEDGE.get(exam_key)
        if not info:
            return f"I don't have detailed info on that exam yet — but I'm always learning! Try asking about UPSC, State PCS, SSC, GATE, Banking, or Railway exams."

        result = info

        # Personal context
        if ctx.skills and exam_key in ("upsc", "pcs", "ssc"):
            result += (
                f"\n\nAlso, looking at your profile, your technical skills could be a great asset for specific specialist roles within the government. "
                f"We can explore those if you prefer a role closer to your domain."
            )
        elif ctx.skills and exam_key == "gate":
            result += (
                f"\n\nWith your technical skills, GATE is very accessible. "
                f"I'd recommend practicing previous year papers — the pattern is highly predictable."
            )

        return result

    # ── Profile tips ──────────────────────────────────────────────── #
    def _profile_tips(self, message: str, ctx: UserContext) -> str:
        first_name = ctx.name.split()[0] if ctx.name not in ("", "there") else "you"
        score = 0
        total = 8
        items = []

        skill_count = len(ctx.skills)
        if skill_count == 0:
            items.append(
                "🔴 **Skills (most important)** — Your skills list is empty right now. "
                "This single field has the biggest impact on your career recommendations. "
                "Add at least 5–8 technical and soft skills you genuinely possess. "
                "Examples: Python, SQL, Excel, Communication, Data Analysis, Project Management."
            )
        elif skill_count < 5:
            items.append(
                f"🟡 **Skills** — You have {skill_count} skill(s) listed. "
                f"Adding {5 - skill_count} more will noticeably improve your match accuracy. "
                f"Think about soft skills too — Communication, Leadership, Problem Solving are always valued."
            )
            score += 1
        else:
            items.append(f"✅ **Skills** — {skill_count} skills listed. Solid! The more specific, the better.")
            score += 2

        interest_count = len(ctx.interests)
        if interest_count == 0:
            items.append(
                "🔴 **Interests** — Interests help me understand what kind of work you'd actually enjoy, "
                "not just what you're capable of. Add broad areas like 'Machine Learning', 'Finance', 'Writing', or 'Healthcare'."
            )
        elif interest_count < 3:
            items.append(
                f"🟡 **Interests** — {interest_count} listed. Aim for 3–5. "
                f"Think about what topics you read about voluntarily, what YouTube rabbit holes you fall into."
            )
            score += 1
        else:
            items.append(f"✅ **Interests** — {interest_count} interests. Good variety!")
            score += 2

        if not ctx.cgpa:
            items.append(
                "🟡 **CGPA** — Not filled in yet. "
                "A CGPA above 6.0 gives a +1% match score per point (up to +10%). "
                "It's a quick win — just log in to Profile and add it."
            )
        elif ctx.cgpa >= 8.5:
            items.append(f"✅ **CGPA {ctx.cgpa}** — Outstanding! You're getting the maximum academic bonus.")
            score += 2
        elif ctx.cgpa >= 6.0:
            items.append(f"✅ **CGPA {ctx.cgpa}** — Above the 6.0 threshold, so you're receiving a score bonus.")
            score += 1
        else:
            items.append(
                f"ℹ️ **CGPA {ctx.cgpa}** — Below 6.0, so no academic bonus applies. "
                f"Compensate by stacking certifications — each one adds +2% to your matches."
            )

        cert_count = len([c for c in ctx.certifications if c.strip()])
        if cert_count == 0:
            items.append(
                "🔴 **Certifications** — Each certification you add boosts your match score by +2% (capped at +10%). "
                "Free or low-cost options: Google Data Analytics (Coursera), AWS Cloud Practitioner, "
                "Microsoft Azure Fundamentals, Meta Front-End Developer. Even one cert makes a difference."
            )
        elif cert_count < 3:
            items.append(
                f"🟡 **Certifications** — {cert_count} added. You need 5 for the full +10% bonus. "
                f"Consider adding {5 - cert_count} more — LinkedIn Learning and Coursera have great options."
            )
            score += 1
        else:
            items.append(f"✅ **Certifications** — {cert_count} certifications. You're getting a strong bonus!")
            score += 2

        if not ctx.career_goals:
            items.append(
                "💡 **Career Goals** — Add a sentence or two about where you want to be in 3–5 years. "
                "This helps me give you much more targeted advice in our conversations."
            )

        pct = round(score / total * 100)
        if pct >= 75:
            summary = f"Your profile is in great shape — {pct}% health score."
        elif pct >= 50:
            summary = f"Decent foundation at {pct}%, but there's room to push higher."
        else:
            summary = f"Your profile is at {pct}% right now — let's fix that together."

        header = f"✨ **Profile Health Check for {first_name}: {pct}%**\n\n{summary}\n\n"
        return header + "\n\n".join(items) + "\n\nHead to the **Profile** page to make these updates — it takes less than 5 minutes and the improvement in your recommendations will be noticeable!"

    # ── Career detail ─────────────────────────────────────────────── #
    def _career_detail(self, message: str, ctx: UserContext) -> str:
        career_name = _extract_career_name(message, self._kb_names)
        if not career_name:
            return (
                "Which career would you like to know more about? Just ask something like:\n"
                "> *Tell me about Data Scientist / ML Engineer*\n"
                "> *What is Software Developer?*\n\n"
                f"I have detailed info on: {', '.join(self._kb_names[:8])}, and more."
            )

        career = next(
            (c for c in self._kb_careers if c["career_name"].lower() == career_name.lower()),
            None,
        )
        if not career:
            return f"I couldn't find details for **{career_name}**."

        first_name = ctx.name.split()[0] if ctx.name not in ("", "there") else "you"
        overview = career.get("overview") or career.get("description", "")
        skills = career.get("typical_skills", [])[:8]
        ext = _CAREER_EXTENDED_KNOWLEDGE.get(career_name.lower(), {})

        # Intro
        result = f"So you're curious about **{career_name}**. It's a great field. {overview}\n\n"

        # Day in life
        if ext.get("day_in_life"):
            result += f"**What's the day-to-day like?**\n{ext['day_in_life']}\n\n"

        # Market & Salary
        market = ext.get("market", "")
        salary = ext.get("entry_salary") or career.get("salary_range") or "competitive salaries"
        if market:
            result += f"**The Market & Pay:**\n{market} Financially, you're looking at {salary}. "
        else:
            result += f"**The Pay:**\nFinancially, you're looking at {salary}. "

        top_companies = ext.get("top_companies") or ", ".join(career.get("industries", [])[:5])
        if top_companies:
            result += f"Top employers typically include {top_companies}.\n\n"
        else:
            result += "\n\n"

        # Skills & Fit
        user_skills = {s.lower() for s in ctx.skills + ctx.interests}
        typical_lower = {s.lower() for s in skills}
        matched = user_skills & typical_lower

        if matched:
            result += (
                f"**Your Fit:**\nHere's the exciting part for {first_name}—you already have {len(matched)} of the core skills for this role "
                f"({', '.join(list(matched)[:3])}). The rest (like {', '.join([s for s in skills if s.lower() not in matched][:3])}) "
                f"can be picked up through targeted learning.\n\n"
            )
        elif ctx.skills:
            result += (
                f"**Your Fit:**\nI don't see direct skill overlap with your current profile right now. "
                f"This role heavily relies on skills like {', '.join(skills[:4])}. "
                f"But don't let that discourage you—these are highly learnable.\n\n"
            )
        else:
            result += (
                f"**Key Skills:**\nTo thrive in this role, you'd need to build skills like {', '.join(skills[:5])}.\n\n"
            )

        result += "Would you like me to map out a step-by-step **learning roadmap** for this career?"

        return result

    # ── Fallback — smarter, tries to extract intent ───────────────── #
    def _fallback(self, message: str, ctx: UserContext) -> str:
        msg_lower = message.lower().strip()
        first_name = ctx.name.split()[0] if ctx.name not in ("", "there") else "you"

        # Auto-detect if they just typed a career name without "tell me about"
        career_name = _extract_career_name(message, self._kb_names)
        if career_name and len(msg_lower) < 30:
            return self._career_detail(message, ctx)

        # Try to give a partial helpful response based on keywords
        if any(w in msg_lower for w in ["salary", "pay", "earn", "income", "package"]):
            return (
                f"Great question! Salaries vary a lot by role, experience, and company. Here's a quick snapshot:\n\n"
                f"- **Software Developer (India):** ₹4–8 LPA (fresher) → ₹20–50 LPA (senior)\n"
                f"- **Data Scientist:** ₹6–12 LPA (fresher) → ₹25–60 LPA (senior)\n"
                f"- **Government Officer (IAS/PCS):** ₹56,100+/month + allowances\n"
                f"- **Bank PO:** ₹42,020/month starting\n"
                f"- **MBA (IIM):** ₹20–35 LPA average placement\n\n"
                f"Want salary details for a specific career? Just ask — *Tell me about Data Analyst* or *What does a Software Developer earn?*"
            )

        if any(w in msg_lower for w in ["time", "how long", "duration", "years", "months"]):
            return (
                f"Preparation timelines really depend on the goal, but here are realistic estimates:\n\n"
                f"- **UPSC CSE:** 1–2 years of dedicated preparation\n"
                f"- **State PCS:** 6 months – 1.5 years\n"
                f"- **GATE:** 6–12 months (more if from a non-core branch)\n"
                f"- **Banking (IBPS/SBI PO):** 3–6 months\n"
                f"- **SSC CGL:** 4–8 months\n"
                f"- **Learning a new tech skill (for jobs):** 3–6 months with daily practice\n\n"
                f"What specifically are you preparing for? I can give you a more tailored timeline."
            )

        if any(w in msg_lower for w in ["course", "certification", "certificate", "learn online", "mooc"]):
            return (
                f"Here are some highly respected online learning platforms and certifications:\n\n"
                f"**🆓 Free / Affordable:**\n"
                f"- **Coursera** — Google, IBM, Meta, DeepLearning.AI certificates (financial aid available)\n"
                f"- **edX** — MIT, Harvard courses\n"
                f"- **NPTEL** — IIT/IISc courses, government recognised\n"
                f"- **Khan Academy** — Math, CS fundamentals\n\n"
                f"**💼 Industry-valued certs:**\n"
                f"- **AWS Cloud Practitioner / Solutions Architect** — cloud jobs\n"
                f"- **Google Data Analytics / Project Management** — versatile\n"
                f"- **Microsoft Azure / Power BI** — enterprise jobs\n"
                f"- **CFA Level 1** — finance careers\n\n"
                f"Each certification you add to your profile also boosts your PathPilot match score by +2%. "
                f"Want recommendations based on your specific career target?"
            )

        suggestions = "\n".join(f'- "{p}"' for p in self.SUGGESTED_PROMPTS)
        return (
            f"I want to help, {first_name}, but I'm not quite sure what you're asking. "
            f"I'm a career guidance specialist, so I'm best at things like:\n\n"
            f"{suggestions}\n\n"
            f"Feel free to rephrase — or just tell me what's on your mind and I'll do my best!"
        )


# ─────────────────────────────────────────────────────────────────── #
# Singleton factory                                                    #
# ─────────────────────────────────────────────────────────────────── #
_mentor_instance: CareerMentor | None = None


def get_mentor() -> CareerMentor:
    """Return a singleton CareerMentor (reset if called after module reload)."""
    global _mentor_instance
    if _mentor_instance is None:
        _mentor_instance = CareerMentor()
    return _mentor_instance
