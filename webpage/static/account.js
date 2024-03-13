document.addEventListener('DOMContentLoaded', function() {
    // the buttons
    btn1=document.querySelector(".btn");
    // on click, create account
    btn1.addEventListener('click', function(event){
        event.preventDefault();
        this.disabled=true;
        uname=document.querySelector("#username");
        pass=document.querySelector("#Password");
        pass2=document.querySelector("#Password2");
        // check if empty form
        if(pass.value==''||pass2.value==''||uname.value==''){
            alert("please makesure that you have filled out all the fields");
            this.disabled=false;
            return;
        }
        // match the password
        if(pass.value!=pass2.value){
            alert("please makesure that the passwords you inputted are the same");
            this.disabled=false;
            return;
        }
        // send to server
        ret={};
        ret['username']=uname.value;
        ret['password']=pass.value;
        fetch('/create',{method:"POST", body:JSON.stringify(ret), headers: {'Content-Type': 'application/json'}})
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            // check if usrname existed
            if(data['exist']){
                alert('the username already exist, please pick a different one');
                this.disabled=false;
                return;
            }
            // usr registration complete, to dashboard
            location.replace("/dashboard");
        })
    })
})