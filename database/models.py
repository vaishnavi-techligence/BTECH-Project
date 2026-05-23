import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database.db")

def get_db_connection():
  conn = sqlite3.connect(DB_PATH)
  conn.row_factory = sqlite3.Row
  return conn

def init_db():
  """
  Initialize database schema tables:
  1. applications: tracks scanned, matched, scheduled, and submitted jobs
  2. pending_queue: tracks Chronological Application Scheduler queue (Optimal window timings)
  3. career_knowledge_graph: adjacency list tracking role/skill career trajectories
  4. prompt_performance: tracks AFLOW adaptive prompt outcome analytics
  """
  os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
  
  with get_db_connection() as conn:
    cursor = conn.cursor()
    
    # 1. Applications table
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        jd TEXT NOT NULL,
        match_score REAL NOT NULL,
        status TEXT NOT NULL, /* parsed, matched, scheduled, applied, got reply, ghosted */
        created_at TEXT NOT NULL,
        applied_at TEXT,
        skills_matched TEXT,
        skills_missing TEXT,
        cover_letter_path TEXT,
        culture_tone TEXT
      )
    """)
    
    # 2. Chronological Queue table (Innovation A)
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS pending_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER UNIQUE,
        target_send_time TEXT NOT NULL, /* ISO string */
        optimal_timezone TEXT NOT NULL,
        status TEXT DEFAULT 'pending', /* pending, sent */
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )
    """)
    
    # 3. Career Trajectory Knowledge Graph (Innovation 5)
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS career_knowledge_graph (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_node TEXT NOT NULL, /* e.g. Python, Junior Dev */
        target_node TEXT NOT NULL, /* e.g. Data Scientist, Tech Lead */
        edge_weight INTEGER DEFAULT 1, /* co-occurrence frequency */
        node_type TEXT NOT NULL, /* skill-to-role, role-to-role */
        UNIQUE(source_node, target_node)
      )
    """)
    
    # 4. AFLOW Prompt Performance (Innovation 6)
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS prompt_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_name TEXT NOT NULL, /* e.g. Aggressive Metrics, Humble Learner */
        status TEXT NOT NULL, /* got reply, ghosted */
        logged_at TEXT NOT NULL
      )
    """)
    
    conn.commit()
    
  # Pre-populate database if empty (Requirement for high-fidelity viva showcasability)
  seed_database_if_empty()

def seed_database_if_empty():
  with get_db_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM applications")
    if cursor.fetchone()[0] > 0:
      return # Database is already populated
    
    print("Database is empty. Starting high-fidelity data seeding...")
    
    # 1. Seed Applications
    now = datetime.now()
    apps_data = [
      ("Google", "Machine Learning Engineer", "Design scalable deep learning models. Required: Python, PyTorch, PySpark.", 0.89, "got reply", (now - timedelta(days=20)).isoformat(), (now - timedelta(days=19)).isoformat(), "Python, PyTorch", "PySpark", "Collaborative"),
      ("Meta", "Senior Research Scientist", "Pioneering LLM training. Required: Python, PyTorch, CUDA, Research Paper writing.", 0.94, "got reply", (now - timedelta(days=18)).isoformat(), (now - timedelta(days=17)).isoformat(), "Python, PyTorch, CUDA", "Research Papers", "Fast-paced"),
      ("Netflix", "Data Scientist", "Optimize recommendation systems. Required: Python, SQL, Statistics, AWS, RAG.", 0.72, "ghosted", (now - timedelta(days=15)).isoformat(), (now - timedelta(days=14)).isoformat(), "Python, SQL", "AWS, RAG", "Independent"),
      ("Stripe", "Full Stack Engineer", "Scale payment infrastructure. Required: Ruby, React, SQL, AWS, Redis.", 0.65, "ghosted", (now - timedelta(days=12)).isoformat(), (now - timedelta(days=11)).isoformat(), "React, SQL", "Ruby, AWS, Redis", "Metrics-oriented"),
      ("Airbnb", "Backend Engineer", "Re-architecture APIs. Required: Java, Spring Boot, MySQL, Docker, Kubernetes.", 0.78, "applied", (now - timedelta(days=5)).isoformat(), (now - timedelta(days=4)).isoformat(), "MySQL, Docker", "Java, Spring Boot, Kubernetes", "Collaborative"),
      ("Microsoft", "AI Consultant", "Build custom Azure OpenAI integrations. Required: Python, OpenAI, RAG, Enterprise architecture.", 0.88, "applied", (now - timedelta(days=3)).isoformat(), (now - timedelta(days=2)).isoformat(), "Python, RAG", "OpenAI, Azure", "Hierarchical"),
      ("Uber", "Autonomous Vehicle Dev", "Sensors fusion algorithms. Required: C++, CUDA, OpenCV, Kalman Filters.", 0.81, "scheduled", (now - timedelta(days=1)).isoformat(), None, "C++, CUDA", "OpenCV, Kalman Filters", "Fast-paced"),
      ("Amazon", "Software Development Engineer", "AWS cloud provisioning automation. Required: Java, Go, AWS CloudFormation, DynamoDB.", 0.75, "matched", now.isoformat(), None, "AWS, Java", "Go, DynamoDB", "Hierarchical"),
      ("Scale AI", "LLM Prompt Engineer", "Build advanced reasoning trees. Required: Prompting, Python, evaluation, G-Eval.", 0.92, "parsed", now.isoformat(), None, "Prompting, Python", "evaluation, G-Eval", "Fast-paced"),
    ]
    
    for app in apps_data:
      cursor.execute("""
        INSERT INTO applications 
        (company, role, jd, match_score, status, created_at, applied_at, skills_matched, skills_missing, culture_tone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """, app)
      
    # 2. Seed Chronological Queue for the Scheduled application (Innovation A)
    # Target time is set to the upcoming Tuesday/Thursday morning optimal window
    target_time = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    cursor.execute("""
      INSERT INTO pending_queue (application_id, target_send_time, optimal_timezone)
      VALUES (7, ?, 'US/Eastern')
    """, (target_time.isoformat(),))
    
    # 3. Seed Career Knowledge Graph Trajectories (Innovation 5)
    graph_data = [
      # Skill to Role co-occurrences
      ("Python", "Machine Learning Engineer", 25, "skill-to-role"),
      ("PyTorch", "Machine Learning Engineer", 18, "skill-to-role"),
      ("CUDA", "Machine Learning Engineer", 12, "skill-to-role"),
      ("SQL", "Data Scientist", 30, "skill-to-role"),
      ("Python", "Data Scientist", 28, "skill-to-role"),
      ("RAG", "Data Scientist", 15, "skill-to-role"),
      ("Spring Boot", "Backend Engineer", 22, "skill-to-role"),
      ("Java", "Backend Engineer", 20, "skill-to-role"),
      ("Docker", "Backend Engineer", 17, "skill-to-role"),
      
      # Role to Role mobility paths
      ("Junior SDE", "Software Development Engineer", 50, "role-to-role"),
      ("Software Development Engineer", "Machine Learning Engineer", 15, "role-to-role"),
      ("Software Development Engineer", "Senior SDE", 40, "role-to-role"),
      ("Data Analyst", "Data Scientist", 25, "role-to-role"),
      ("Data Scientist", "Senior Research Scientist", 10, "role-to-role"),
      ("Machine Learning Engineer", "Senior Research Scientist", 12, "role-to-role"),
      ("Senior SDE", "Tech Lead", 35, "role-to-role"),
      ("Tech Lead", "Engineering Manager", 20, "role-to-role"),
    ]
    
    for edge in graph_data:
      cursor.execute("""
        INSERT INTO career_knowledge_graph (source_node, target_node, edge_weight, node_type)
        VALUES (?, ?, ?, ?)
      """, edge)
      
    # 4. Seed AFLOW Prompt Performance (Innovation 6)
    # We log that 'Aggressive Metrics' prompt got replies, while 'Humble Learner' was ghosted.
    # This guides the Adaptive Prompt Optimizer to choose the higher performing template!
    prompt_logs = [
      ("Aggressive Metrics", "got reply", (now - timedelta(days=20)).isoformat()),
      ("Aggressive Metrics", "got reply", (now - timedelta(days=18)).isoformat()),
      ("Humble Learner", "ghosted", (now - timedelta(days=15)).isoformat()),
      ("Humble Learner", "ghosted", (now - timedelta(days=12)).isoformat()),
      ("Direct Value Proposer", "got reply", (now - timedelta(days=10)).isoformat()),
      ("Direct Value Proposer", "ghosted", (now - timedelta(days=8)).isoformat()),
    ]
    
    for log in prompt_logs:
      cursor.execute("""
        INSERT INTO prompt_performance (template_name, status, logged_at)
        VALUES (?, ?, ?)
      """, log)
      
    conn.commit()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
  init_db()
  print("SQLite Database initialized at:", DB_PATH)
