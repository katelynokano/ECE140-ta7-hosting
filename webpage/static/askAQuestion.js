document.addEventListener('DOMContentLoaded', function() {
    //the btns
    btn1=document.querySelector("#button1");
    btn2=document.querySelector("#button2");
    lang=document.querySelector("#Language");
    // log out
    btn2.addEventListener('click', function(event){
        event.preventDefault();
        this.disabled=true;
        fetch('/logout',{method:"POST"})
        .then(()=>{
            this.disabled=false;
            location.replace("/");
        })
    })
    // to dashboard
    btn1.addEventListener('click', function(event){
        event.preventDefault();
        location.replace("/dashboard");
    })
    // audio part
    var mediaRecorder;
    const constraints = { audio: true };
    let chunks = [];
    var torecord=true;
    var thetimer;
    record=document.querySelector("#button3");
    // on recording
    record.addEventListener('click', function(){
        // first to record
        if(torecord){
            // first click start
            navigator.mediaDevices
            .getUserMedia(constraints)
            .then((stream) => {
                // start recording
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();
                record.style.background = "red";
                record.style.color = "black";
                torecord=false;
                // auto off in 15sec
                thetimer=setTimeout(() => {
                    mediaRecorder.stop();
                    record.style.background = "";
                    record.style.color = "";
                    torecord=true;
                }, 15000);
                mediaRecorder.addEventListener('stop', function(){
                    // when recording stopped
                    const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
                    let values=new FormData()
                    values.append("file",blob)
                    // send to transcribe
                    fetch('/trancribe',{method:"POST", body: values})
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error(`HTTP Error: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then((data) => {
                        // check if need translate
                        var usrlang;
                        var totrans=false;
                        if(data.toLowerCase().includes("answer in")){
                            totrans=true;
                            start=data.toLowerCase().indexOf("answer in")+10;
                            end=(data.substr(start)).search(/[^A-Za-z]/);
                            // check if the language is translateable
                            if(theLang=document.querySelector(`#${data.substr(start, end).toLowerCase()}`)){
                                usrlang=theLang.value;
                                data=data.substr(0,start)+data.substr(end);
                            }else{
                                alert('the language specified is not transcribe able');
                                totrans=false;
                            }
                        }
                        // get the answer
                        fetch('/answer',{method:"POST", body:JSON.stringify({"question": data}), headers: {'Content-Type': 'application/json'}})
                        .then((response) => {
                            if (!response.ok) {
                                throw new Error(`HTTP Error: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then((answer) => {
                            ret=document.querySelector("#chat");
                            // if need translation as user request
                            if(totrans){
                                // translate q
                                fetch('/trans',{method:"POST", body:JSON.stringify({"text": data,"target_lang":usrlang}), headers: {'Content-Type': 'application/json'}})
                                .then((response) => {
                                    if (!response.ok) {
                                        throw new Error(`HTTP Error: ${response.status}`);
                                    }
                                    return response.json();
                                })
                                .then((tran) => {
                                    // add q
                                    p = document.createElement("p");
                                    p.innerHTML = tran;
                                    ret.appendChild(p);
                                })
                                // translate a
                                fetch('/trans',{method:"POST", body:JSON.stringify({"text": "Answer: "+answer,"target_lang":usrlang}), headers: {'Content-Type': 'application/json'}})
                                .then((response) => {
                                    if (!response.ok) {
                                        throw new Error(`HTTP Error: ${response.status}`);
                                    }
                                    return response.json();
                                })
                                .then((trans) => {
                                    // add a, speech for a in the usr specified lang
                                    p = document.createElement("p");
                                    p.innerHTML = trans;
                                    ret.appendChild(p);
                                    let utterance = new SpeechSynthesisUtterance(trans);
                                    utterance.lang=usrlang;
                                    speechSynthesis.speak(utterance);
                                })
                            }else{
                                // if not usr specify in q, then trans to webpage apecified(default en)
                                fetch('/trans',{method:"POST", body:JSON.stringify({"text": data,"target_lang":lang.value}), headers: {'Content-Type': 'application/json'}})
                                .then((response) => {
                                    if (!response.ok) {
                                        throw new Error(`HTTP Error: ${response.status}`);
                                    }
                                    return response.json();
                                })
                                .then((tran) => {
                                    // add q
                                    p = document.createElement("p");
                                    p.innerHTML = tran;
                                    ret.appendChild(p);
                                })
                                fetch('/trans',{method:"POST", body:JSON.stringify({"text": "Answer: "+answer,"target_lang":lang.value}), headers: {'Content-Type': 'application/json'}})
                                .then((response) => {
                                    if (!response.ok) {
                                        throw new Error(`HTTP Error: ${response.status}`);
                                    }
                                    return response.json();
                                })
                                .then((trans) => {
                                    // add a, speak in webpage lang
                                    p = document.createElement("p");
                                    p.innerHTML = trans;
                                    ret.appendChild(p);
                                    let utterance = new SpeechSynthesisUtterance(trans);
                                    utterance.lang=lang.value;
                                    speechSynthesis.speak(utterance);
                                })
                            }
                        })
                    })
                    chunks = [];
                });
                mediaRecorder.ondataavailable = (e) => {
                    chunks.push(e.data);
                };
            })
            .catch((err) => {
                console.error(`The following error occurred: ${err}`);
            });
        }else{
            // on sec click, stop the audio recording, and timer
            clearTimeout(thetimer)
            mediaRecorder.stop();
            record.style.background = "";
            record.style.color = "";
            torecord=true;
        }
    });
    lang.addEventListener('change', async function(event){
        // when usr change lang
        event.preventDefault();
        this.disabled=true;
        ret=document.querySelector("#chat");
        // translate past conversation
        for (childs of ret.childNodes) {
            const response = await fetch('/trans',{method:"POST", body:JSON.stringify({"text": childs.innerHTML,"target_lang":lang.value}), headers: {'Content-Type': 'application/json'}})
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }
                return response.json();
            })
            .then((trans) => {
                childs.innerHTML=trans;
            })
        }
        this.disabled=false;
    })
})