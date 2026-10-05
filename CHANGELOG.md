# Changelog

All notable changes to the SmartApply project will be documented in this file.

## [Unreleased] - August 27, 2026

### Features & Enhancements
- **Online Job Crawler & Multi-Match Engine:** Implemented an autonomous search engine to dynamically scrape and score job descriptions from live feeds (Jobicy, Remotive, Arbeitnow, WeWorkRemotely) concurrently.
- **Advanced Career Trajectory Visualization:** Overhauled the SVG-based career mobility graph in the frontend. Added dynamic node placement to prevent overlapping elements on complex datasets.
- **Skill Gap Highlighting:** Upgraded the UI to intelligently differentiate required job skills:
  - **Matched Skills:** Highlighted in emerald green with a checkmark.
  - **Missing Skills:** Highlighted with amber dashed borders and warning icons for immediate visibility.
  - **Standard Skills:** Maintained default styling.

### Performance Optimizations
- **Embedding Caching:** Applied an `lru_cache` to `get_embedding()` in `rag_engine/matcher.py` to prevent recalculating vector embeddings for duplicate phrases, massively speeding up the skill extraction pipeline.
- **Lazy Loading ML Models:** Refactored `sentence_transformers` to load lazily inside the handler. This explicitly fixes a severe process-hanging deadlock during initialization on Windows.

### Bug Fixes & Accuracy Improvements
- **Skill Extraction Accuracy:** Significantly expanded the `non_skills` filter list to catch common resume/academic stop-words (e.g., "EDUCATION", "BACHELOR", "EXPERIENCE").
- **Acronym Heuristics:** Added a filter to ignore entirely uppercase lines (typically headings or names) when attempting to extract 2-6 letter acronyms, minimizing false-positive skills.
- **Crawler Patch:** Fixed a critical bug in the web crawler to restore stable job feed fetching.

### Merges & Testing
- Integrated the `prachiti` feature branch into main, which included local database model updates and new test suites (`test_main.py`, `test_import.py`).
