from fastapi import FastAPI, Request, UploadFile, Form
from fastapi.responses import Response, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
import uvicorn, os, requests, random, bcrypt
import mysql.connector as mysql
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional, Annotated
from sessiondb import Sessions
from functools import wraps

# set Database connection variables
load_dotenv()
db_host = "localhost"
db_user = "root"
db_pass = os.environ['MYSQL_ROOT_PASSWORD']
my_UCSD_PID = os.environ['UCSD_PID']
db_name = "TechAssignment7"
app = FastAPI()
sessions = Sessions(db_config={"host": db_host,"user": db_user,"password": db_pass,"database": db_name},expiry=900)

# verification
class account(BaseModel):
    username: str
    password: str
class dataReq(BaseModel):
    sensorType: Optional[str] = None
    endTime: Optional[str] = None
    startTime: Optional[str] = None
    location: Optional[str] = None

# mount the static folder
app.mount("/static", StaticFiles(directory="./static"), name="static")
# if logged in
def was_logged_in(func):
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        # check session
        session = sessions.get_session(request)
        if len(session) > 0:
            sessions.extend_sec(request)
            return RedirectResponse(url='/dashboard', status_code=302)
        return func(request, *args, **kwargs)
    return wrapper
#public
@app.get("/")
# if validated user
@was_logged_in
# else
def get_home(request:Request):
    with open("index.html") as html:
        return HTMLResponse(content=html.read())

@app.get("/create")
# if validated user
@was_logged_in
# else
def get_account(request:Request):
    with open("create account.html") as html:
        return HTMLResponse(content=html.read())

@app.get("/login")
# if validated user
@was_logged_in
# else
def get_login(request:Request):
    with open("login.html") as html:
        return HTMLResponse(content=html.read())

# make sure they are logged in
def is_logged_in(func):
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        session = sessions.get_session(request)
        if len(session) > 0:
            sessions.extend_sec(request)
        else:
            return RedirectResponse(url='/', status_code=302)
        return func(request, *args, **kwargs)
    return wrapper

# user only
@app.get("/FAQAI", response_class=HTMLResponse)
# check if valid user
@is_logged_in
def get_FAQ(request:Request):
    with open("ask_a_question.html") as html:
        return HTMLResponse(content=html.read()) 

@app.get("/dashboard", response_class=HTMLResponse)
# check if valid user
@is_logged_in
def get_dashboard(request:Request):
    with open("dashboard.html") as html:
        return HTMLResponse(content=html.read())   
    
# new user
@app.post("/create")
def new_account(acc: account, request:Request, response:Response):
    # hash password
    password=bcrypt.hashpw(acc.password.encode('utf-8'), bcrypt.gensalt())
    # setup connect db
    db = mysql.connect(host=db_host, database=db_name, user=db_user, passwd=db_pass)
    cursor = db.cursor()
    # query if user name already exist
    resp={'exist':False}
    sql = "select * from user where BINARY username=(%s);"
    cursor.execute(sql, (acc.username,))
    record = cursor.fetchone()
    if record is not None:
        resp['exist']=True
        return resp
    # query insert
    sql = "INSERT INTO user (username,password) VALUES (%s,%s);"
    cursor.execute(sql, (acc.username,password))
    # close db
    db.commit()
    db.close()
    session_data = {'username': acc.username, 'logged_in': True}
    session_id = sessions.create_session(response, session_data)
# return syntax and get the validation working
    return resp
@app.post("/login")
def user_login(acc: account, request:Request, response:Response):
    # setup connect db
    resp={'isuser':False}
    db = mysql.connect(host=db_host, database=db_name, user=db_user, passwd=db_pass)
    cursor = db.cursor()
    # query select to check user exist
    sql = "select password from user where BINARY username=(%s);"
    cursor.execute(sql, (acc.username,))
    record = cursor.fetchone()
    if record is not None:
        # check password
        if(bcrypt.checkpw(acc.password.encode('utf-8'), record[0].encode('utf-8'))):
            resp['isuser']=True
            session = sessions.get_session(request)
            if len(session) > 0:
                sessions.end_session(request, response)
            session_data = {'username': acc.username, 'logged_in': True}
            session_id = sessions.create_session(response, session_data)
    # close db
    db.commit()
    db.close()
# return syntax and get the validation working
    return resp

@app.post("/logout")
def user_logout(request:Request, response:Response):
    session = sessions.get_session(request)
    if len(session) > 0:
        sessions.end_session(request, response)
        

# data for graph
@app.put("/data")
def put_data(req:dataReq,request:Request):
    # check if usr still in session
    session = sessions.get_session(request)
    if len(session) > 0:
        sessions.extend_sec(request)
    else:
        return RedirectResponse(url='/', status_code=302)
    url=f'https://ece140.frosty-sky-f43d.workers.dev/api/query?auth={my_UCSD_PID}'#&userId={my_UCSD_PID}'
    if(req.sensorType): url+=f'&sensorType={req.sensorType}'
    resp = requests.get(url)
    data = resp.json()['results']
    labels=[]
    datasets={}
    for row in data:
        # {'location', 'sensorType','sensorName, 'value', 'unit','time'}
        if(req.location):
            if(row['location']!=req.location): 
                continue
        thetime=row['time']
        if(req.startTime):
            if(req.startTime>thetime):
                continue
        if(req.endTime):
            if(req.endTime<thetime):
                continue
        thetime=thetime.replace('Z','')
        thelabel=row['location']+":"+row['sensorType']
        if(thetime not in labels):
            labels.append(thetime)
        if(thelabel in datasets): 
            datasets[thelabel].append({'y':row['value'],'x':thetime})
        else:
            datasets[thelabel]=[{'y':row['value'],'x':thetime}]
    sets=[]
    for key,value in datasets.items():
        sets.append({'label':key,'data':value,'borderColor':f'rgb({random.randint(0,255)},{random.randint(0,255)},{random.randint(0,255)})'})
    retdata={'labels':labels,'datasets':sets}
    return retdata

# data about the type of data
@app.get("/data")
def get_data():
    url=f'https://ece140.frosty-sky-f43d.workers.dev/api/query?auth={my_UCSD_PID}'#&userId={my_UCSD_PID}'
    resp = requests.get(url)
    data = resp.json()['results']
    location=[]
    sensorType=[]
    time=[]
    for row in data:
        # {'location', 'sensorType','sensorName, 'value', 'unit','time'}
        thetime=row['time']
        thelabel=row['location']+":"+row['sensorType']
        if(row['location'] not in location): location.append(row['location'])
        if(row['sensorType'] not in sensorType): sensorType.append(row['sensorType'])
        if(row['time'] not in time): time.append(row['time'])
    retdata={'location':location,'sensorType':sensorType,'time':time}
    return retdata

# transcribe given audio
@app.post("/trancribe")
async def transcript(file:UploadFile):
    url=f'https://ece140.frosty-sky-f43d.workers.dev/api/transcribe'
    resp = requests.post(url,files={"file":(file.filename, file.file, file.content_type)}, data={"auth":my_UCSD_PID})
    ret = resp.json()
    return ret['transcription']

# answer the q
@app.post("/answer")
async def answer(request:Request):
    url=f'https://ece140.frosty-sky-f43d.workers.dev/api/query?auth={my_UCSD_PID}'#&userId={my_UCSD_PID}'
    resp = requests.get(url)
    data = resp.json()['results']
    datasets={}
    for row in data:
        thetype=row['sensorType']
        datasets[thetype]=row['value']
    value= await request.json()
    url='https://ece140.frosty-sky-f43d.workers.dev/api/inference'
    resp = requests.post(url,json={"auth":my_UCSD_PID, "sensorData":datasets, "question":value['question']})
    ret = resp.json()
    return ret['suggestion']

# translate
@app.post("/trans")
async def answer(request:Request):
    # check session
    session = sessions.get_session(request)
    if len(session) > 0:
        sessions.extend_sec(request)
    else:
        return {"session out":True}
    value= await request.json()
    url='https://ece140.frosty-sky-f43d.workers.dev/api/translate'
    resp = requests.post(url,json={"auth":my_UCSD_PID, "text":value["text"], "target_lang":value["target_lang"]})
    ret = resp.json()
    return ret['transcription']

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=6543)


