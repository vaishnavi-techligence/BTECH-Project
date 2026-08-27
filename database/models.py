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
    
    # 0. Users table
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    """)
    
    # 1. Applications table
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
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
        user_id INTEGER NOT NULL,
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
        user_id INTEGER NOT NULL,
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
    # Check if applications are populated
    cursor.execute("SELECT COUNT(*) FROM applications")
    if cursor.fetchone()[0] == 0:
      print("Database is empty. Starting high-fidelity data seeding...")
      
      # 0. Seed Demo User
      now = datetime.now()
      
      try:
          import bcrypt
          hashed_pwd = bcrypt.hashpw("password".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
      except ImportError:
          # Fallback if dependencies not installed during first init
          hashed_pwd = "dummy_hash"
          
      cursor.execute("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)", 
                     ("demo_user", hashed_pwd, now.isoformat()))
      demo_user_id = cursor.lastrowid
      
      # 1. Seed Applications
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
          (user_id, company, role, jd, match_score, status, created_at, applied_at, skills_matched, skills_missing, culture_tone)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (demo_user_id,) + app)
        
      # 2. Seed Chronological Queue for the Scheduled application (Innovation A)
      target_time = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
      cursor.execute("""
        INSERT INTO pending_queue (user_id, application_id, target_send_time, optimal_timezone)
        VALUES (?, 7, ?, 'US/Eastern')
      """, (demo_user_id, target_time.isoformat()))
      
      # 4. Seed AFLOW Prompt Performance (Innovation 6)
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
          INSERT INTO prompt_performance (user_id, template_name, status, logged_at)
          VALUES (?, ?, ?, ?)
        """, (demo_user_id,) + log)

    # 3. Seed Career Knowledge Graph Trajectories (Innovation 5) - Idempotent
    graph_data = [
      # Skill to Role co-occurrences (Covering all 9 seeded job applications)
      ("Python", "Machine Learning Engineer", 28, "skill-to-role"),
      ("PyTorch", "Machine Learning Engineer", 24, "skill-to-role"),
      ("CUDA", "Machine Learning Engineer", 15, "skill-to-role"),
      ("Python", "Senior Research Scientist", 30, "skill-to-role"),
      ("PyTorch", "Senior Research Scientist", 26, "skill-to-role"),
      ("CUDA", "Senior Research Scientist", 20, "skill-to-role"),
      ("SQL", "Data Scientist", 30, "skill-to-role"),
      ("Python", "Data Scientist", 28, "skill-to-role"),
      ("RAG", "Data Scientist", 18, "skill-to-role"),
      ("Spring Boot", "Backend Engineer", 22, "skill-to-role"),
      ("Java", "Backend Engineer", 25, "skill-to-role"),
      ("Docker", "Backend Engineer", 20, "skill-to-role"),
      ("React", "Full Stack Engineer", 26, "skill-to-role"),
      ("Ruby", "Full Stack Engineer", 18, "skill-to-role"),
      ("SQL", "Full Stack Engineer", 22, "skill-to-role"),
      ("Python", "AI Consultant", 25, "skill-to-role"),
      ("RAG", "AI Consultant", 22, "skill-to-role"),
      ("OpenAI", "AI Consultant", 24, "skill-to-role"),
      ("C++", "Autonomous Vehicle Dev", 26, "skill-to-role"),
      ("CUDA", "Autonomous Vehicle Dev", 22, "skill-to-role"),
      ("Python", "LLM Prompt Engineer", 25, "skill-to-role"),
      ("Prompting", "LLM Prompt Engineer", 30, "skill-to-role"),
      ("G-Eval", "LLM Prompt Engineer", 20, "skill-to-role"),
      ("Java", "Software Development Engineer", 28, "skill-to-role"),
      ("AWS", "Software Development Engineer", 24, "skill-to-role"),
      
      # Role to Role mobility paths (Connecting entry, mid, and senior roles)
      ("Junior SDE", "Software Development Engineer", 50, "role-to-role"),
      ("Data Analyst", "Data Scientist", 35, "role-to-role"),
      ("Software Development Engineer", "Backend Engineer", 40, "role-to-role"),
      ("Software Development Engineer", "Full Stack Engineer", 42, "role-to-role"),
      ("Software Development Engineer", "Senior SDE", 45, "role-to-role"),
      ("Software Development Engineer", "Machine Learning Engineer", 20, "role-to-role"),
      ("Backend Engineer", "Tech Lead", 35, "role-to-role"),
      ("Full Stack Engineer", "Tech Lead", 30, "role-to-role"),
      ("Data Scientist", "Machine Learning Engineer", 30, "role-to-role"),
      ("Data Scientist", "AI Consultant", 22, "role-to-role"),
      ("Machine Learning Engineer", "Senior Research Scientist", 18, "role-to-role"),
      ("Machine Learning Engineer", "AI Consultant", 25, "role-to-role"),
      ("Machine Learning Engineer", "Autonomous Vehicle Dev", 20, "role-to-role"),
      ("Software Development Engineer", "LLM Prompt Engineer", 22, "role-to-role"),
      ("Senior SDE", "Tech Lead", 40, "role-to-role"),
      ("Tech Lead", "Engineering Manager", 30, "role-to-role"),
    ]
    
    for edge in graph_data:
      cursor.execute("""
        INSERT OR IGNORE INTO career_knowledge_graph (source_node, target_node, edge_weight, node_type)
        VALUES (?, ?, ?, ?)
      """, edge)
      
    conn.commit()
    print("Database seeding and graph verification completed successfully.")

if __name__ == "__main__":
  init_db()
  print("SQLite Database initialized at:", DB_PATH)
