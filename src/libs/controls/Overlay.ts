
export class Loader{

    private _loader : HTMLElement;
    private _text : HTMLElement;
    private _quit : HTMLElement;
    private _doubleCheck : {
        overlay : HTMLElement;
        confirm : HTMLElement;
        cancel : HTMLElement;
    };
    private _cancel : boolean;

    
    constructor(){
        this._loader = <HTMLElement>document.getElementById("loader");
        this._text = <HTMLElement>document.getElementById("loader text");
        this._quit = <HTMLElement>document.getElementById("quit");
        this._doubleCheck = {
            overlay : <HTMLElement>document.getElementById("double check"),
            confirm : <HTMLElement>document.getElementById("confirm"),
            cancel : <HTMLElement>document.getElementById("cancel"),
        };
        this._cancel = false;
    }


    public initCallback(){
        this._quit.addEventListener('click', () => {this.quitBtnResponse();});
        this._doubleCheck.confirm.addEventListener('click', () => {this.confirmBtnResponse();});
        this._doubleCheck.cancel.addEventListener('click', () => {this.cancelBtnResponse();});

    }

    private quitBtnResponse(){
        this._doubleCheck.overlay.classList.toggle('hidden', false);
    }

    private confirmBtnResponse(){
        this._doubleCheck.overlay.classList.toggle('hidden', true);
        this._cancel = true;
    }

    private cancelBtnResponse(){
        this._doubleCheck.overlay.classList.toggle('hidden', true);
        this._cancel = false;
    }

    public load(bool : boolean){
        this.text = "";

        this._loader.classList.toggle('hidden', !bool);
        this._doubleCheck.overlay.classList.toggle('hidden', true);
        this._cancel = false;
        
    }

    set text(text: string){
        this._text.textContent = text;
    }


    get cancel(){
        return this._cancel;
    }

}

export class DropDown{
    private _resetValue : number;
    private _value: number;
    private _button : HTMLButtonElement;
    private _overlay : HTMLElement;
    private _element : HTMLElement[];

    private _resetStr :string; 


    constructor(idName : string, initvalue: number = 0){
        this._resetValue = initvalue;
        this._value = initvalue;
        

        const dropdown = <HTMLElement>document.getElementById(idName);
        this._button = <HTMLButtonElement>dropdown.querySelector(".dropbtn");
        this._button.addEventListener('focus', ()=>{this._overlay.classList.toggle('hidden', false);})
        this._button.addEventListener('blur', ()=>{this._overlay.classList.toggle('hidden', true);})

        this._overlay = <HTMLElement>dropdown.querySelector(".content");

        this._resetStr = this._button.textContent?this._button.textContent : "";

        const elements = dropdown.querySelectorAll(".element");
        this._element = [];
        for(let i = 0; i< elements.length; i++){
            let temp = <HTMLElement>elements[i];
            this._element.push(temp);
            temp.addEventListener('mousedown', ()=>{
                this.value = Number(temp.getAttribute("value")); 
                this._overlay.classList.toggle('hidden', true);
                this._button.textContent = temp.textContent;
            });
        }

        this.reset();
    }
    public reset(){
        this.value = this._resetValue;
        this._overlay.classList.toggle('hidden', true);
        this._button.textContent =  this._resetStr
    }

    set value(val : number | undefined){
        val = val?val : this._resetValue;
        this._value = val;
    }

    get value() : number{
        return this._value;
    }
}



