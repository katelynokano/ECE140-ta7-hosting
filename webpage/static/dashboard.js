// import Chart from 'chart.js/auto';
document.addEventListener('DOMContentLoaded', function() {
    // the chart
    ctx = document.getElementById('myChart');
    sensor=document.querySelector("#sensor")
    loc=document.querySelector("#location")
    st=document.querySelector("#start_time")
    et=document.querySelector("#end_time")
    // set attribute to prevent the user from manually enter date time outside of range or invalid times
    st.setAttribute("onkeyDown", "return false")
    et.setAttribute("onkeyDown", "return false")
    //new graph based on pass in values
    function newgraph(theData){
        //if old chart, remove
        theChart = Chart.getChart("myChart");
        if (theChart != undefined) {
            theChart.destroy();
        }
        //create new
        new Chart(ctx, {
            type: 'line',
            data:theData,
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                hour: 'yyyy-MM-dd HH:mm'
                            }
                        }
                    }
                }
            }
        });
    }
    // the default data
    fetch('/data',{method:'PUT', body:JSON.stringify({}), headers: {'Content-Type': 'application/json'}})
    .then((response) => {
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return response.json();
    })
    .then((theData) => { 
        if(theData["session out"]){
            location.replace("/");
        }
        //graph it
        newgraph(theData);
    });
    //populate the selectbars
    fetch('/data',{method:'GET'})
    .then((response) => {
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return response.json();
    })
    .then((theData) => { 
        //add all locations to select
        theData['location'].forEach(val => {
            const node = document.getElementById("itemTemp");
            const clone = node.cloneNode(true);
            loc.appendChild(clone);
            loc.lastElementChild.id=val;
            loc.lastElementChild.value=val;
            loc.lastElementChild.innerHTML=val;
        });
        //add all sensor type to select
        theData['sensorType'].forEach(val => {
            const node = document.getElementById("itemTemp");
            const clone = node.cloneNode(true);
            sensor.appendChild(clone);
            sensor.lastElementChild.id=val;
            sensor.lastElementChild.value=val;
            sensor.lastElementChild.innerHTML=val;
        });
        et.min=(theData['time'][0]).slice(0,-5)
        st.min=(theData['time'][0]).slice(0,-5)
        et.max=(theData['time'][theData['time'].length-1]).slice(0,-5)
        st.max=(theData['time'][theData['time'].length-1]).slice(0,-5)
        st.value=(theData['time'][0]).slice(0,-5)
        et.value=(theData['time'][theData['time'].length-1]).slice(0,-5)
    });
    // update graph
    function updategraph(){
        ret={};
        ret['location']=(loc.value ? loc.value:null);
        ret['startTime']=(st.value ? st.value:null);
        ret['endTime']=(et.value ? et.value:null);
        ret['sensorType']=(sensor.value ? sensor.value:null);
        fetch('/data',{method:'PUT', body:JSON.stringify(ret), headers: {'Content-Type': 'application/json'}})
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            return response.json();
        })
        .then((theData) => { 
            if(theData["session out"]){
                location.replace("/");
            }
            //graph the data
            newgraph(theData);
        });
    }
    // on change
    loc.addEventListener('change',updategraph);
    st.addEventListener('change',updategraph);
    et.addEventListener('change',updategraph);
    sensor.addEventListener('change',updategraph);
    // the other btns
    btn1=document.querySelector("#button1");
    btn2=document.querySelector("#button2");
    // logout
    btn2.addEventListener('click', function(event){
        event.preventDefault();
        this.disabled=true;
        fetch('/logout',{method:"POST"})
        .then(()=>{
            this.disabled=false;
            location.replace("/");
        })
    })
    // faq
    btn1.addEventListener('click', function(event){
        event.preventDefault();
        location.replace("/FAQAI");
    })
})