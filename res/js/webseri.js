class Webserial
{
    constructor()
    {
        this._serialPort = {};
        this.isOpen = false;
    }

    async connect(parameters)
    {
        try
        {
            this._serialPort = await navigator.serial.requestPort();

            await this._serialPort.open({
                baudRate : parameters.baudRate,
                dataBits : parseInt(parameters.dataBits),
                stopBits : parseInt(parameters.stopBits),
                parity: parameters.parity,
                flowControl: parameters.flowControl
            });
            
            this.isOpen = true;
        }
        catch(ex)
        {
            console.log(ex);
            this.isOpen =  false;
        }
        return this.isOpen;
    }

    async disconnect()
    {
        try
        {
            await this._serialPort.close();
            this.isOpen = false;
            return true;
        }
        catch(ex)
        {
            console.log(ex);
            return false;
        }
    }

    async readArray()
    {
        try
        {
            const reader = this._serialPort.readable.getReader();

            while (true)
            {
                const { value, done } = await reader.read();
                
                if(value)
                {
                    reader.releaseLock();
                    return value;
                }
                
                if (done)
                {
                    reader.releaseLock();
                    return null;
                }
            }
        }
        catch(ex)
        {
            console.log(ex);
            return null;
        }
    }

    async writeArray(dataArray)
    {
        if(!this.isOpen) return false;

        try
        {
            console.log(dataArray);
            const writer = this._serialPort.writable.getWriter();
            await writer.write(dataArray);
            writer.releaseLock();
            return true;
        }
        catch(ex)
        {
            console.log(ex);
            return false;
        }
    }
}

class WebSerialParameters
{
    baudRate;
    dataBits;
    stopBits;
    parity;
    flowControl;
}


let webserial = new Webserial();
let rawTxHistory = [];

function checkWebSerialBrowerSupport()
{
    if (!("serial" in navigator)) 
        { alert("Dieser Browser unterstützt kein Webserial!"); }
}


async function connect()
{
    webSerialParameters = new WebSerialParameters();
    webSerialParameters.baudRate = document.getElementById("selectBaudRate").value;
    webSerialParameters.dataBits = document.getElementById("selectDataBits").value;
    webSerialParameters.stopBits = document.getElementById("selectStopbits").value;
    webSerialParameters.parity = document.getElementById("selectParity").value;
    webSerialParameters.flowControl = document.getElementById("selectHardWareFlowControl").checked ? "hardware" : "none";
    console.log(webSerialParameters);

    if(await webserial.connect(webSerialParameters))
    { 
        document.getElementById("connectButton").innerHTML = "Verbunden";
        document.getElementById("selectComPortContainer collapsible").click();
        document.getElementById("selectComPortContainer label").classList.add("connected");
        readLoop();
    }
}


async function readLoop()
{
    let rxTextArea = document.getElementById("rxTextArea");

    while (webserial.isOpen)
    {
        let data = await webserial.readArray();
        if(data)
        {
            let decoder = new TextDecoder();
            console.log(data);
            rxTextArea.innerHTML += decoder.decode(data);
            rxTextArea.scrollTop = rxTextArea.scrollHeight;
        }
    }
}


function alterFontSize(element, defaultValue, stepValue)
{
    originalSize = parseInt(element.style.fontSize.replace("px", ""));
    originalSize = isNaN(originalSize) ? defaultValue : originalSize;
    element.style.fontSize = originalSize + stepValue;
}


function clearRxData()
{
    document.getElementById("rxTextArea").innerHTML = "";
    document.getElementById("rxTextArea").value = "";
}


function clearTxData()
{
    document.getElementById("txTextArea").value = "";
}


function clearTxHistory()
{
    rawTxHistory = [];
}


async function sendTxData()
{
    sendOnEnterValue = document.getElementById("selectWhatSendAfter").value;
    dataToSend = document.getElementById("txTextArea").value + sendOnEnterValue;

    let encoder = new TextEncoder();
    let encodedData = encoder.encode(dataToSend);

    if(!await webserial.writeArray(encodedData))
    {
        console.log("Could not send TX data")
        return;
    };

    rawTxHistory.push(new Date().toISOString(), encodedData);
    clearTxData();
}


async function onTxKeydown(event)
{
    if (event.keyCode === 13)
    {
        event.preventDefault();
        await sendTxData();
    } 
}


function showTxHistoryModal()
{
    document.getElementById("myModal").style.display = "block";
    let tbodyRef = document.getElementById("txHistoryTable").getElementsByTagName("tbody")[0];
    
    for(var i = 1; i < document.getElementById("txHistoryTable").rows.length;)
        { document.getElementById("txHistoryTable").deleteRow(i); }

    for(var entry = 0; entry < rawTxHistory.length; entry+=2)
    {
        let newRow = tbodyRef.insertRow();
        let newDate = document.createTextNode(rawTxHistory[entry].replace('T', ' '));
        let newDataAsText = document.createTextNode(new TextDecoder().decode(rawTxHistory[entry+1]).replace(/[\r]/gi,"<CR>").replace(/[\n]/gi,"<LF>"));
        let newDataAsArray = Array.from(rawTxHistory[entry + 1]).map((i) => i.toString(16).toUpperCase().padStart(2,'0')).join(' ');

        let newDateCell = newRow.insertCell(0);
        newDateCell.appendChild(newDate);
        let newDateAsTextCell = newRow.insertCell(1);
        newDateAsTextCell.appendChild(newDataAsText);
        let newDataAsArrayCell = newRow.insertCell(2);
        newDataAsArrayCell.innerHTML = newDataAsArray;
    }
}


function closeTxHistoryModal()
{
    document.getElementById("myModal").style.display = "none";
}


function SaveRxDataToFile()
{
    var a = document.createElement("a");
    var blob = new Blob([rxTextArea.innerHTML], {type: "octet/stream"});
    var url = window.URL.createObjectURL(blob);

    a.href = url;
    a.download = "RxHistory_" + new Date().toLocaleString().replace(/[.,: ]/gi,"_") + ".txt";
    a.click();
    window.URL.revokeObjectURL(url);
}