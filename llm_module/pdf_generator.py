import io
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT

def generate_resume_pdf(resume_text: str, company: str = "", role: str = "") -> bytes:
    """
    Generates an executive-grade, ATS-optimized PDF resume using ReportLab.
    Returns the PDF file contents as bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    primary_color = colors.HexColor("#1e3a8a")     # Deep Navy
    secondary_color = colors.HexColor("#0284c7")   # Slate Blue
    text_color = colors.HexColor("#1e293b")        # Dark Slate
    muted_color = colors.HexColor("#64748b")       # Grey
    
    # Custom Styles
    styles.add(ParagraphStyle(
        name='ResumeName',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        alignment=TA_CENTER,
        spaceAfter=4
    ))
    
    styles.add(ParagraphStyle(
        name='ResumeContact',
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=muted_color,
        alignment=TA_CENTER,
        spaceAfter=14
    ))
    
    styles.add(ParagraphStyle(
        name='ResumeSectionHeader',
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=4,
        keepWithNext=True
    ))
    
    styles.add(ParagraphStyle(
        name='ResumeBody',
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=text_color,
        spaceAfter=6,
        alignment=TA_LEFT
    ))
    
    styles.add(ParagraphStyle(
        name='ResumeBullet',
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=text_color,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4,
        alignment=TA_LEFT
    ))
    
    story = []
    
    lines = [l.strip() for l in resume_text.split('\n') if l.strip()]
    if not lines:
        lines = ["Candidate Name", "Email | Phone | LinkedIn", "SUMMARY", "Experienced engineer."]
        
    # Process Header / Name
    name_line = lines[0]
    if "==" in name_line or "--" in name_line:
        name_line = lines[1] if len(lines) > 1 else "Candidate Resume"
    name_line = re.sub(r'^[=\-*#\s]+|[=\-*#\s]+$', '', name_line).strip()
    name_line = name_line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    story.append(Paragraph(name_line, styles['ResumeName']))
    
    # Process Contact Info (line 1 or 2)
    contact_idx = 1 if lines[0] == name_line or "==" in lines[0] else 2
    if contact_idx < len(lines):
        contact_line = lines[contact_idx]
        contact_line = re.sub(r'^[=\-*#\s]+|[=\-*#\s]+$', '', contact_line).strip()
        contact_line = contact_line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        story.append(Paragraph(contact_line, styles['ResumeContact']))
        story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=10))
    
    # Process remaining lines
    start_idx = contact_idx + 1
    for line in lines[start_idx:]:
        # Skip decorative divider lines
        if re.match(r'^[=\-_]{4,}$', line):
            continue
            
        # Check if line is a Section Header
        clean_line = re.sub(r'^[#\s]+', '', line).strip()
        is_header = False
        upper_line = clean_line.upper()
        
        headers_kw = ["SUMMARY", "EXPERIENCE", "SKILLS", "EDUCATION", "PROJECTS", "CERTIFICATIONS", "COMPETENCIES", "WORK HISTORY", "EMPLOYMENT", "TECHNICAL SKILLS", "PROFESSIONAL EXPERIENCE"]
        if any(upper_line.startswith(kw) for kw in headers_kw) or (upper_line == clean_line and len(clean_line) > 4 and len(clean_line) < 60 and not clean_line.startswith("•") and not clean_line.startswith("-")):
            is_header = True
            
        if is_header:
            story.append(Spacer(1, 4))
            header_text = clean_line.upper().replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(header_text, styles['ResumeSectionHeader']))
            story.append(HRFlowable(width="100%", thickness=0.8, color=secondary_color, spaceBefore=1, spaceAfter=6))
        elif clean_line.startswith("•") or clean_line.startswith("-") or clean_line.startswith("*"):
            bullet_text = re.sub(r'^[•\-*\s]+', '', clean_line).strip()
            bullet_text = bullet_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(f"&bull; &nbsp; {bullet_text}", styles['ResumeBullet']))
        else:
            p_text = clean_line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(p_text, styles['ResumeBody']))
            
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
