document.addEventListener('DOMContentLoaded', function() {
    // btn
    btn1=document.querySelector(".btn");
    // login
    btn1.addEventListener('click', function(event){
        event.preventDefault();
        this.disabled=true;
        uname=document.querySelector("#username");
        pass=document.querySelector("#Password");
        // check field
        if(pass.value==''||uname.value==''){
            alert("please makesure that you have filled out all the fields");
            this.disabled=false;
            return;
        }
        ret={};
        ret['username']=uname.value;
        ret['password']=pass.value;
        // try login
        fetch('/login',{method:"POST", body:JSON.stringify(ret), headers: {'Content-Type': 'application/json'}})
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            // check valid user
            if(data['isuser']){
                // send to dashboard
                location.replace("/dashboard");
            }else{
                alert("check your username and password")
                this.disabled=false;
            }
        })
    })
})