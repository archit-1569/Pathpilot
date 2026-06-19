import pytest
from app.ml.resume_analyzer import ResumeAnalyzer

@pytest.fixture
def analyzer():
    return ResumeAnalyzer()

def test_analyze_unknown_career(analyzer):
    result = analyzer.analyze("I know Python and SQL.", "Nonexistent Career 123")
    assert result["score"] == 0
    assert "Could not find career" in result["formatting_feedback"][0]

def test_analyze_known_career(analyzer):
    # Data Scientist usually requires python, sql, machine learning
    resume_text = "I am a Data Scientist. I have 5 years of experience in Python, SQL, and Machine learning."
    result = analyzer.analyze(resume_text, "Data Scientist")
    
    assert result["score"] > 0
    assert "python" in result["matching_skills"] or "sql" in result["matching_skills"]
    assert len(result["missing_skills"]) > 0

def test_formatting_feedback_short_resume(analyzer):
    result = analyzer.analyze("Too short", "Data Scientist")
    assert any("short" in fb.lower() for fb in result["formatting_feedback"])

def test_formatting_feedback_no_links(analyzer):
    result = analyzer.analyze("This resume has no external references at all. " * 10, "Data Scientist")
    assert any("links" in fb.lower() for fb in result["formatting_feedback"])

def test_formatting_feedback_has_links(analyzer):
    result = analyzer.analyze("Check out my github https://github.com/myprofile " * 10, "Data Scientist")
    assert not any("links" in fb.lower() for fb in result["formatting_feedback"])
