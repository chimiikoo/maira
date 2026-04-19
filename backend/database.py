from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base


DB_URL = 'postgresql://postgres:admin@localhost/Nails_By_Maira'

engine = create_engine(DB_URL)

Base = declarative_base