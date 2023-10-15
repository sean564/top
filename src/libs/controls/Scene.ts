import { vec2, vec3 } from "gl-matrix";


import { LinkedKnot } from "../knot/LinkedKnot"
import { FourierKnot } from "../knot/FourierKnot"
import { Quintuples, WebGPUCalc } from "../knot/Quintuples"

import { Loader, DropDown } from "../controls/Overlay"

type SceneType = "Linked Knot" | "Fourier Knot" | "Quintuples";

export class Scene{

    private _linkedKnot : LinkedKnot;
    private _fourierKnot : FourierKnot;
    private _webGPUCalc : WebGPUCalc;
    private _quintpules : Quintuples;

    private _freeze : boolean;

    private _knotMenu : KnotMenu;
    private _loader : Loader;

    private _exportData : HTMLElement | null;


    constructor(){

        this._loader = new Loader();
        this._loader.initCallback();
        this._linkedKnot = new LinkedKnot();
        this._fourierKnot = new FourierKnot();
        this._quintpules = new Quintuples();
        this._webGPUCalc = new WebGPUCalc();

        this._freeze = false;

        this._knotMenu = new KnotMenu(this);
        this._knotMenu.initCallback();

        this._exportData = document.getElementById("export-data");
        this._exportData?.addEventListener("click", () =>{this.exportData();})

    }


    get sceneType(){
        return this._knotMenu.sceneType;
    }

    public async advanceScene(str : SceneType){

        this._freeze = true;
        this.linkedKnot.selected = null;
        this.linkedKnot.drawingTool.Disable(true);

        if(str === "Quintuples"){

            if(!this.fourierKnot.calculated || this.fourierKnot.intersecting){
                alert("Tried to find circles on incomplete knot");
                this._knotMenu.sceneType = "Fourier Knot";
            }

            this._loader.load(true);
            await Loader.timeout(10);

            this._webGPUCalc.initKnot(this.fourierKnot.exportKIArr());
            await this._webGPUCalc.findCircles(this.quintuples, this._knotMenu.doubleCheck, this._knotMenu.maxCircles, this._knotMenu.knotDivision, this._loader);

            this._loader.load(false);
            this._knotMenu.resetCircleOption();
            

            if(!this._webGPUCalc.calculated){
                this._knotMenu.sceneType = "Fourier Knot";
                this._freeze = false;
                return;
            }
            this._knotMenu.sceneType = "Quintuples";
            this.quintuples.player.reset();
            
        }else if(str === "Fourier Knot"){

            if(!this.linkedKnot.isKnot){
                alert("Tried to smoothen incomplete knot")
                this._knotMenu.sceneType = "Linked Knot";
            }

            this.fourierKnot.calcFourierFromLinked(<vec3[]>this.linkedKnot.nodeArr);
            this._knotMenu.sceneType = "Fourier Knot";
        }
        this._freeze = false;
    }


    public setPresetData(frames : Frames, knotDivision: number, nodeArr : vec3[]){

        this._knotMenu.sceneType = "Quintuples";
        this.fourierKnot.calcFourierFromLinked(nodeArr);
        this.quintuples.setFrameData(frames, knotDivision);

    }

    public drawScene(gl : WebGLRenderingContext, program : WebGLProgram, preset: boolean) {

        if(this._freeze){
            return;
        }
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if((this.sceneType == "Quintuples") || preset){
            this._fourierKnot.draw(gl, program);
            this._quintpules.draw(gl, program);
            
        }else if(this.sceneType == "Fourier Knot"){
            this._fourierKnot.draw(gl, program);
        } else if(this.sceneType == "Linked Knot"){
            this.linkedKnot.draw(gl, program);

        }

    }


    get linkedKnot(){
        return this._linkedKnot;
    }

    get fourierKnot(){
        return this._fourierKnot;
    }

    get quintuples(){
        return this._quintpules;
    }

    get webGPUCalc(){
        return this._webGPUCalc;
    }

    get transform_z(){
        return this.linkedKnot.transform_z;
    }

    get knotMenu(){
        return this._knotMenu;
    }

    set transform_z(bool : boolean){
        this.linkedKnot.transform_z = bool;
    }


    get selected(){
        return this.linkedKnot.selected;
    }

    get InsertOrConnect(){
        return this.linkedKnot.drawingTool.connectLast || this.linkedKnot.drawingTool.insert;
    }

    get EraseOrSubdiv(){
        return this.linkedKnot.drawingTool.erase || this.linkedKnot.drawingTool.subdivide;
    }

    get selectedNode(){
        return this.linkedKnot.selectedNode;
    }

    public btnManager(){
        this._knotMenu.disableAdvance();
        this._knotMenu.disableDelete();
        
    }

    private exportData() {
        const data = {
            frames : this.quintuples.frames,
            knotDivision : this.quintuples.player.max,
            nodeArr : <vec3[]>this.linkedKnot.nodeArr,
            wrongPolyList : this.webGPUCalc.wrongPoly
        };
      
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {
          type: "text/plain"
        }));
        a.setAttribute("download", "data.knot");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }


}




export class KnotMenu{
    
    private _advance : HTMLButtonElement;
    private _delete : HTMLElement;

    private _doubleCheck : {

        overlay : HTMLElement;
        confirm : HTMLElement;
        cancel : HTMLElement;
    };

    private _slider :{
        linkedKnot : HTMLInputElement;
        fourierKnot : HTMLInputElement;
        quintuples : HTMLInputElement;
    }

    private _circleOptions:{
        overlay : HTMLElement;
        doubleCheck : HTMLInputElement;
        maxCircles : DropDown;
        knotDivision : DropDown;
        submit : HTMLElement;
        cancel : HTMLElement;
    }



    private _scene : Scene;
    private _sceneType : SceneType;
    

    constructor(scene : Scene){
        this._scene = scene;
        this._sceneType = "Linked Knot";

        this._advance = <HTMLButtonElement>document.getElementById("advance scene");
        this._delete = <HTMLElement>document.getElementById("delete scene");
        this._doubleCheck = {
            overlay : <HTMLElement>document.getElementById("delete-check"),
            confirm : <HTMLElement>document.getElementById("delete-confirm"),
            cancel : <HTMLElement>document.getElementById("delete-cancel"),
        };

        this._slider = {
            linkedKnot : <HTMLInputElement>document.getElementById("Linked Knot"),
            fourierKnot : <HTMLInputElement>document.getElementById("Fourier Knot"),
            quintuples : <HTMLInputElement>document.getElementById("Quintuples"),
        };

        this._slider.fourierKnot.disabled = true;
        this._slider.quintuples.disabled = true;


        this._circleOptions = {
            overlay : <HTMLElement>document.getElementById("circle options"),
            doubleCheck : <HTMLInputElement>document.getElementById("double check box"),
            maxCircles : new DropDown("circle max dropdown", 8),
            knotDivision : new DropDown("knotDivision", 2000),
            submit : <HTMLElement>document.getElementById("confirm calculate"),
            cancel: <HTMLElement>document.getElementById("cancel calculate"),
        }
        this.sceneType = "Linked Knot";
        this.cancelBtnResponse();
    }

    public Disable(bool : boolean){
        document.getElementById("scene manager")?.classList.toggle("hidden", bool);
    }


    public initCallback(){
        this._advance.addEventListener('click', () => {this.advanceBtnResponse();});
        this._delete.addEventListener('click', ()=>{this.deleteBtnResponse();});

        this._doubleCheck.confirm.addEventListener('click', () => {this.confirmBtnResponse();});
        this._doubleCheck.cancel.addEventListener('click', () => {this.cancelBtnResponse();});

        document.addEventListener('mousedown', (event) => {   
            if ((this.sceneType === "Linked Knot") && !(this._doubleCheck.overlay.contains(event.target as Node)) && !(this._doubleCheck.overlay.classList.contains("hidden"))){
  
                this._doubleCheck.overlay.classList.toggle("hidden", true);
            }
        });

        this._slider.linkedKnot.addEventListener('click', ()=>{this.sceneSelect();});
        this._slider.fourierKnot.addEventListener('click', ()=>{this.sceneSelect();});
        this._slider.quintuples.addEventListener('click', ()=>{this.sceneSelect();});


        this._circleOptions.submit.addEventListener('click', () => {this._circleOptions.overlay.classList.toggle('hidden', true); this._scene.advanceScene("Quintuples");});
        this._circleOptions.cancel.addEventListener('click', () => {this.resetCircleOption();});

    }

    private advanceBtnResponse(){
        if(this.sceneType === "Linked Knot"){
            this._scene.advanceScene("Fourier Knot");
        }else if(this.sceneType === "Fourier Knot"){
            this._circleOptions.overlay.classList.toggle('hidden', false);
        }
    }

    public resetCircleOption(){
        this._circleOptions.knotDivision.reset();
        this._circleOptions.maxCircles.reset();
        this._circleOptions.doubleCheck.checked = true;
        this._circleOptions.overlay.classList.toggle('hidden', true);
    }

    get knotDivision(){
        return this._circleOptions.knotDivision.value;
    }

    get maxCircles(){
        return this._circleOptions.maxCircles.value;
    }

    get doubleCheck(){
        return this._circleOptions.doubleCheck.checked;
    }


    private deleteBtnResponse(){
        if(this.sceneType === "Linked Knot"){
            this._doubleCheck.overlay.classList.toggle('hidden', false);
        }
    }

    private confirmBtnResponse(){
        if(this.sceneType === "Linked Knot"){
            this._scene.linkedKnot.deleteData();
            this._doubleCheck.overlay.classList.toggle("hidden", true);
            this.disableDelete();
            this.disableAdvance();
        }
    }
    
    private cancelBtnResponse(){
        this._doubleCheck.overlay.classList.toggle('hidden', true);
    }

    public disableDelete(){
        if((this.sceneType == "Linked Knot") && !this._scene.linkedKnot.isEmpty){
            this._delete.classList.toggle('hidden', false);
        }else{
            this._delete.classList.toggle('hidden', true);
        }
    }

    public disableAdvance(){
        if(this.sceneType == "Linked Knot"){
            this._advance.disabled = !this._scene.linkedKnot.isKnot;
        }else if(this.sceneType == "Fourier Knot"){
            this._advance.disabled = this._scene.fourierKnot.intersecting;
        }
    }

    public sceneSelect(){
        if(this._slider.linkedKnot.checked){
            this.sceneType = "Linked Knot";
        }else if(this._slider.fourierKnot.checked){
            this.sceneType = "Fourier Knot";
        }else if(this._slider.quintuples.checked){
            this.sceneType = "Quintuples";
        }
    }

    
    get sceneType(){
        return this._sceneType;
    }

    set sceneType(scenetype : SceneType){
        this._sceneType = scenetype;
        if(this.sceneType == "Linked Knot"){
            this._slider.linkedKnot.checked = true;
            this._scene.linkedKnot.drawingTool.Disable(false);
            this._scene.quintuples.player.Disable(true);
            this._advance.textContent = "Smoothen Knot"
        }else if(this.sceneType == "Fourier Knot"){
            this._slider.fourierKnot.disabled = false;
            this._slider.fourierKnot.checked = true;
            this._scene.linkedKnot.selected = null;
            this._scene.linkedKnot.drawingTool.Disable(true);
            this._scene.quintuples.player.Disable(true);
            this._advance.textContent = "Find Circles"
        }else if(this.sceneType == "Quintuples"){
            this._slider.quintuples.disabled = false;
            this._slider.quintuples.checked = true;
            this._scene.linkedKnot.selected = null;
            this._scene.linkedKnot.drawingTool.Disable(true);
            this._scene.quintuples.player.Disable(false);
        }
        this._advance.setAttribute('sceneType', this._sceneType);
        this.disableAdvance();
        this.disableDelete();
        this.resetCircleOption();
        this._circleOptions.overlay.classList.toggle('hidden', true);
    }


    

}
