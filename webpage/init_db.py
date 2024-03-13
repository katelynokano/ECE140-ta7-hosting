# Add the necessary imports
import mysql.connector as mysql
import os, bcrypt
from dotenv import load_dotenv

load_dotenv()

# set Database connection variables
db_host = "localhost"
db_user = "root"
db_pass = os.environ['MYSQL_ROOT_PASSWORD']

# Connect to the db and create a cursor object
db = mysql.connect(user=db_user, password=db_pass, host=db_host)
cursor = db.cursor()
#create db and use it
cursor.execute("CREATE DATABASE if not exists TechAssignment7")
cursor.execute("USE TechAssignment7")

# create table user
try:
    pass1='bad-c0de'
    pass2='hello-w0rld'
    pass1=bcrypt.hashpw(pass1.encode('utf-8'), bcrypt.gensalt())
    pass2=bcrypt.hashpw(pass2.encode('utf-8'), bcrypt.gensalt())
    cursor.execute("""
    create table if not exists sessions (
        session_id varchar(64) primary key,
        session_data json not null,
        created_at timestamp not null default current_timestamp
    );""")
    cursor.execute("""
    CREATE TABLE if not exists User(
        user_id        integer  AUTO_INCREMENT PRIMARY KEY,
        username       VARCHAR(64) NOT NULL,
        password       VARCHAR(64) NOT NULL
    );""")
    # add rows
    query = 'INSERT INTO User (username,password) VALUES (%s, %s)'
    cursor.executemany(query, (['po-hsuan',pass1],['katelyn',pass2],))
except RuntimeError as err:
    print("runtime error: {0}".format(err))

# send the change to the db
db.commit()
