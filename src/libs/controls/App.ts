import MainVertexShader from "../../shaders/MainVertex.glsl"
import MainfragShader from "../../shaders/MainFrag.glsl"
import { glUtils } from "../utils/glUtils"
import { uiUtils } from "../utils/uiUtils"
import { vec3, vec4 } from "gl-matrix"
import { Camera } from "../models/Camera"
import { Light } from "../models/Light"
import { Scene } from "./Scene"


const clickDist = 25;


export class App {

    private canvas : HTMLCanvasElement;
    private boundingClientRect : DOMRect;
    private gl : WebGLRenderingContext;
    private programs : {
        render : WebGLProgram;
    };

    private camera! : Camera;
    private scene : Scene;

    private ui : {
        left_down: boolean;
        wheel_down: boolean;
        mouse: {
            lastX: number;
            lastY: number;
        };
        doubleClick: {
            click : boolean;
            sameObj : boolean;
            lastX: number;
            lastY: number;
        };
        shift: boolean;
    };


    private _fps : {
        fpsLimit : number;
        prev: number;
    }

    private _infoPage : {
        hidden : boolean;
        overlay : HTMLElement;
        btn : HTMLElement;
        exit : HTMLElement;
    }

    private _presetPage : {
        preset : boolean;
        presetOverlay : HTMLElement;
    }



    constructor(canvas : HTMLCanvasElement){

        this.canvas = canvas;
        this.boundingClientRect = this.canvas.getBoundingClientRect();
        this.gl = <WebGLRenderingContext>glUtils.checkWebGL(this.canvas);
        this.programs = {
            render : <WebGLProgram>glUtils.createProgram(this.gl, MainVertexShader, MainfragShader)
        };

        this.scene = new Scene();

        

        this.ui = {
            left_down: false,
            wheel_down: false,
            mouse: {
                lastX: 0,
                lastY: 0,
            },
            doubleClick: {
                click : false,
                sameObj : false,
                lastX: 0,
                lastY: 0,
            },
            shift: false,
        };

        this._fps = {
            fpsLimit : 30,
            prev: 0,
        }

        this._infoPage = {
            hidden : true,
            overlay : <HTMLElement>document.getElementById("about overlay"),
            btn : <HTMLElement>document.getElementById("about button"),
            exit : <HTMLElement>document.getElementById("info-exit"),
        }

        this._presetPage = {
            preset : false,
            presetOverlay : <HTMLElement>document.getElementById("preset-overlay")
        }

    }

    public Initialize(){
        this.scene.webGPUCalc.Initialize();
        this.initPreLoadCallbacks();
    }
    

     
    private initGL() {
        this.gl.clearColor(0.9855,0.9867,0.9812,1);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.useProgram(this.programs.render);
        Light.setLight(this.gl, this.programs.render, [50, 50, 50]);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.blendEquation(this.gl.FUNC_ADD);
    }

    private initPreLoadCallbacks(){
        document.addEventListener('click', (event) => 
        {   
            if(this._infoPage.btn.contains(event.target as Node)){
                this._infoPage.overlay.classList.toggle("hidden", false); this._infoPage.hidden = false;
                //@ts-ignore
                this._infoPage.overlay.querySelector("#info-content").scrollTop = 0;
                return;
            }else if(this._infoPage.exit.contains(event.target as Node)){
                this._infoPage.overlay.classList.toggle("hidden", true); this._infoPage.hidden = true;
            }else if (!this._infoPage.hidden && !(this._infoPage.overlay.querySelector("#info-content")?.contains(event.target as Node)) && !(this._infoPage.overlay.querySelector("#info-menu")?.contains(event.target as Node))){
                
                this._infoPage.overlay.classList.toggle("hidden", true);
                this._infoPage.hidden = true;
            } 
        });


        
        document.getElementById("camera button")?.addEventListener('click', () => {this.camera.reset = true;})

        const elements = this._presetPage.presetOverlay.querySelectorAll(".button");
        for(let i = 0; i< elements.length; i++){
            let temp = <HTMLElement>elements[i];
            temp.addEventListener('click', ()=>{
                const value = temp.getAttribute("value"); 
                if(value === "New Knot"){
                    window.addEventListener("beforeunload", (event) => {
                        event.returnValue = true;
                    });
                    this._presetPage.preset = false;
                    this.scene.NewKnot();
                    this.scene.knotMenu.Disable(false);
                    this.run();
                }else{
                    const myRequest = new Request(value?value:"");
                    fetch(myRequest)
                      .then((response) => response.json())
                      .then((data) => {
                        this.scene.setPresetData(data.frames, data.knotDivision, data.nodeArr);
                        this._presetPage.preset = true;
                        this.run();
                    }).catch(console.error);
                }
            });
        }


    }


    private initCallbacks() {

    
        this.canvas.addEventListener('mousedown', (event) => {this.mouseDown(event);});

        document.addEventListener("mouseup", (event : MouseEvent) => {this.mouseUp(event);});
        document.addEventListener("click", (event: MouseEvent)=>
        {
            if((event.target as HTMLElement).id == this.canvas.id){
                if(this.ui.doubleClick.click){
                    if(this.scene.InsertOrConnect || this.scene.EraseOrSubdiv){
                        this.scene.linkedKnot.btnManager();
                    }else if(this.ui.doubleClick.sameObj){
                        this.scene.transform_z = !this.scene.transform_z;
                    }
                }
            }
            
            this.scene.btnManager();
            this.ui.doubleClick.sameObj = false;
            this.configCamera();
        
        });


        document.addEventListener("mousemove", (event : MouseEvent) => {this.mouseMove(event);});

        document.addEventListener("keydown",  (event : KeyboardEvent) => {this.keyDown(event);});
        document.addEventListener("keyup",  (event : KeyboardEvent) => {this.keyUp(event);});

        window.addEventListener("resize",  () => {this.resizer();});

        this.canvas.addEventListener("wheel", (event : WheelEvent) =>
        {
            this.zoom(event);
            if(event.ctrlKey == true)
            {
                event.preventDefault(); 
            }
        },
        {passive : false});


    }
        
    private configCamera() {
        this.camera.update(this.gl, this.programs.render, this.canvas.width, this.canvas.height);
        this.camera.setRay();
    }
        

    private run(){

        this._presetPage.presetOverlay.classList.toggle('hidden', true);
        document.getElementById("container")?.classList.toggle('hidden', false);

        
        this.camera = new Camera();
        if(this._presetPage.preset){
            this.camera.changeBase({
                theta : 0.7,
                phi : 0.7,
                radius : 16,
                trans : [0,0,0],
            })
        }
        this.initCallbacks();
        this.initGL();
        this.resizer();
        
        requestAnimationFrame(this.animate.bind(this));
    }

   
        
    private animate(time : number) : void {
        requestAnimationFrame(this.animate.bind(this));

        if(this.camera.reset){
            this.camera.resetCam(this.gl, this.programs.render, this.canvas.width, this.canvas.height);
        }
                    
        const deltaTime = (time - this._fps.prev);         
        if (deltaTime < ((1000 / this._fps.fpsLimit)-0.1)) {
            return;
        }

        this.scene.drawScene(this.gl, this.programs.render, this._presetPage.preset);
        

    }
        
    
        
    private keyDown(event : KeyboardEvent) {
        this.ui.shift = event.shiftKey;   
        if(event.key === "Delete"){
            this.scene.linkedKnot.delete();
        }else if(event.key === "Backspace"){
            this.scene.linkedKnot.delete();
        }

        if((event.key == '=' && event.ctrlKey == true) || (event.key == '-' && event.ctrlKey == true))
        {
            event.preventDefault(); 
        }
    }
    private keyUp(event : KeyboardEvent){
        this.ui.shift = event.shiftKey;
    }
        
        
    private mouseDown(event : MouseEvent) {
        if(this.camera.reset){
            this.camera.reset = false;
            this.configCamera();
        }
        
        this.ui.doubleClick.click = true;
        this.ui.doubleClick.lastX = event.clientX;
        this.ui.doubleClick.lastY = event.clientY;

        if(event.button == 0){

            this.ui.left_down = true;
            const temp = this.scene.selected;
            if((this.scene.sceneType == "Linked Knot") && !this.scene.InsertOrConnect){

                const {relx,rely} = uiUtils.pixelInputToGLCoord(event, this.boundingClientRect);
    
                var from = vec4.transformMat4(vec4.create(), [relx, rely, -1, 1], this.camera.toWorld);
                var to = vec4.transformMat4(vec4.create(), [relx, rely, 1, 1], this.camera.toWorld);
                vec4.scale(from, from, 1/from[3]);
                vec4.scale(to, to, 1/to[3]);
                
                const dirvec = vec3.subtract(vec3.create(), [to[0], to[1], to[2]], [from[0], from[1], from[2]]);
        
                this.scene.linkedKnot.pickObj(dirvec, this.camera.absPos);

            }
            if((temp === this.scene.selected) && (this.scene.selectedNode || this.ui.shift)){
                this.ui.doubleClick.sameObj = true;
            }

        } 

        if(event.button == 1){
            this.ui.wheel_down = true;
        }
        
    }
    
    private mouseUp(event : MouseEvent) {
        if(event.button == 0){
            this.ui.left_down = false;
        }

        if(event.button == 1){
            this.ui.wheel_down = false;
        }

        this.camera.setRay();

    }

    private checkClick(x: number, y: number, diff: number = clickDist){
        const diffX = Math.abs(x - this.ui.doubleClick.lastX);
        const diffY = Math.abs(y - this.ui.doubleClick.lastY);
        return ((diffX < diff) && (diffY < diff));
    }
    
        
    private mouseMove(event : MouseEvent) {
        const x = event.clientX;
        const y = event.clientY;
        if (!this.scene.selectedNode && (this.ui.left_down || this.ui.wheel_down)) {   

            const factor = 1/this.canvas.height;
            const dx = factor * (x - this.ui.mouse.lastX);
            const dy = factor * (y - this.ui.mouse.lastY);

            if (this.ui.left_down && !this.ui.shift) {
                this.camera.addAngle(dx, dy);
                this.camera.update(this.gl, this.programs.render, this.canvas.width, this.canvas.height);
                this.ui.doubleClick.click = false;
            }else if ((this.ui.wheel_down) || (this.ui.shift && this.ui.left_down)) {
                if(this.ui.doubleClick.click){
                    this.ui.doubleClick.click = this.checkClick(x,y, 3);
                }
                this.camera.transform(dx, dy, this.scene.transform_z);
                this.camera.update(this.gl, this.programs.render, this.canvas.width, this.canvas.height);
            }


        }else if((this.scene.sceneType == "Linked Knot") && (this.scene.InsertOrConnect || this.scene.EraseOrSubdiv) && (this.ui.left_down || this.ui.wheel_down)){

            if (this.ui.doubleClick.click) {
                this.ui.doubleClick.click = this.checkClick(x,y);
                return;
            } 

            const factor = 1/this.canvas.height;
            const dx = factor * (x - this.ui.mouse.lastX);
            const dy = factor * (y - this.ui.mouse.lastY);

            if (this.ui.left_down && !this.ui.shift) {
                this.camera.addAngle(dx, dy);
                this.camera.update(this.gl, this.programs.render, this.canvas.width, this.canvas.height);
            }else if ((this.ui.wheel_down) || (this.ui.shift && this.ui.left_down)) {
                this.camera.transform(dx, dy, this.scene.transform_z);
                this.camera.update(this.gl, this.programs.render, this.canvas.width, this.canvas.height);
            }
            
        }else if((this.scene.sceneType == "Linked Knot") && this.scene.selectedNode && (this.ui.left_down || this.scene.InsertOrConnect)){

            if(this.ui.doubleClick.click){
                this.ui.doubleClick.click = this.checkClick(x,y, 3);
                return;
            }

            const {relx,rely} = uiUtils.pixelInputToGLCoord(event, this.boundingClientRect);
    
            var from = vec4.transformMat4(vec4.create(), [relx, rely, -1, 1], this.camera.toWorld);
            var to = vec4.transformMat4(vec4.create(), [relx, rely, 1, 1], this.camera.toWorld);
            vec4.scale(from, from, 1/from[3]);
            vec4.scale(to, to, 1/to[3]);
            
            const dirvec = vec3.subtract(vec3.create(), [to[0], to[1], to[2]], [from[0], from[1], from[2]]);
    
            this.scene.linkedKnot.moveNode(dirvec, this.camera.absPos, this.camera.normal);
           
        }

        this.ui.mouse.lastX = x;
        this.ui.mouse.lastY = y;
    }
        

    private zoom(event : WheelEvent) {
        this.camera.reset = false;
        this.camera.addRadius(event.deltaY);
        this.configCamera();
    }

    private resizer(){
        this.scene.quintuples.player.resize();
        this.resizeCanvasToDisplaySize();
        this.configCamera();
        this.boundingClientRect = this.canvas.getBoundingClientRect();
    }

    private resizeCanvasToDisplaySize() {
        const dpr = window.devicePixelRatio;
        const {width, height} = this.canvas.getBoundingClientRect();
        const displayWidth  = Math.round(width * dpr);
        const displayHeight = Math.round(height * dpr);
  
        this.canvas.width  = displayWidth;
        this.canvas.height = displayHeight;
        
    }

}