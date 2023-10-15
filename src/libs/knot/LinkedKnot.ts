import { Sphere } from "../objects/Sphere"
import { Cylinder } from "../objects/Cylinder"
import { XYPlane } from "../objects/XYPlane"
import { PlanarArrows, VerticalArrows } from "../objects/Arrow"
import { Guide } from "../objects/Guide"
import { vec2, vec3 } from "gl-matrix";

const adjacent = 0.25;


export class LinkedKnot{

    private _nodeStack : Stack; 
    private _edgeStack : Stack; 
    private _nodeNum : number;
    private _edgeNum : number;
    private _isKnot : boolean;
    private _nodeArr : vec3[];

    private _transform_z : boolean;

    private _selected : Node | Edge | null;

    private _xyPlane : XYPlane;
    private _planeArrows : PlanarArrows;
    private _verticalArrows : VerticalArrows;

    private _guide : Guide;

    private _overlapNode : Node | null;

    private _drawingTool : DrawingTool;


    constructor(){
        this._nodeStack = new Stack();

        this._edgeStack = new Stack();
        this._nodeNum = 0;
        this._edgeNum = 0;
        this._isKnot =  false;
        this._nodeArr = [];

        this._transform_z = false;

        this._selected = null;

        this._xyPlane = new XYPlane();
        this._planeArrows =  new PlanarArrows();
        this._verticalArrows = new VerticalArrows();

        this._guide = new Guide();

        this._overlapNode = null;
        this._drawingTool = new DrawingTool(this);
        this._drawingTool.initCallback();

        
const input = <HTMLInputElement>document.getElementById("link-data");
input?.addEventListener('change', async() => {

    async function getData(file: File) {
        return new Promise<String>((resolve, reject) => {
            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = (event: any) => {
                resolve(<String>reader.result);
            };
        });
    }
    this.deleteData();
    var strdata : String = "";
    //@ts-ignore
    if(input.files.length == 0){
        return;
    }
    //@ts-ignore
    var strdata = await getData(input.files[0]);
    var lines = strdata.split('\n');;
    var elements;
    var updatedPos: vec3;
    if(lines.length <= 2){
        return;
    }
    for (let i =0; i<lines.length; i++){
        elements = lines[i].split(", ");
        if(elements.length < 3){
            break;
        }
        this.insert();
        updatedPos = [parseFloat(elements[0]),parseFloat(elements[1]),parseFloat(elements[2])];
        if(this.selected instanceof Node){
            this.selected.object.position = updatedPos;
        
            this.selected.prevCur?.updatePos(); 
            this.selected.curNext?.updatePos();
        }
        if(i != 0){
            //@ts-ignore
            this.connect(this._nodeStack.data[i-1], this.selected);
        } 
    }
    //@ts-ignore
    this.connect(this.selected, this._nodeStack.data[0]);
});


    }

    public deleteData(){
        this._nodeStack = new Stack();
        this._edgeStack = new Stack();
        this._nodeNum = 0;
        this._edgeNum = 0;
        this._isKnot =  false;
        this._nodeArr = [];
        this._selected = null;
        this._drawingTool.reset();
    }


    public insert(){
        /*
            insert a node.
        */
        var pos : vec3= [0,0,0]
        if(this.selectedNode){
            // @ts-ignore
            pos = this.selected.object.position;
            // @ts-ignore
            this._overlapNode = this.selected;
        }


        const index = this._nodeStack.available();
        if(index > 255){
            alert("Can only have at most 255 Nodes");
            return;
        }

        const node = new Node(pos);
        this._nodeStack.insert(
            node,
            index
        );
        this.nodeNum++;
        this._isKnot =  false;
        this.selected = node;
    }

    public connect(prev : Node, next : Node){

        const index = this._edgeStack.available();
        if(index > 255){
            alert("Can only have at most 255 Edges");
            return;
        }

        var edge : Edge;

        if(!prev.curNext && !next.prevCur){
            edge = new Edge(prev, next);
        } else if (!prev.prevCur && !next.curNext){
            edge = new Edge(next, prev);
        } else if(!prev.curNext && !next.curNext){
            LinkedKnot.reverse(next);
            edge = new Edge(prev, next);
        }else if(!prev.prevCur && !next.prevCur){
            LinkedKnot.reverse(prev);
            edge = new Edge(prev, next);
        }else{
            alert("Nodes can have at most 2 edges");
            return;
        }
        this._edgeStack.insert(
            edge,
            index
        );
        this.edgeNum++;

        this.checkKnot();

    }

    public subdivide(){
        if(this.selected instanceof Edge){
            const startNode : Node = this.selected.startNode;
            const endNode : Node = this.selected.endNode;
            const pos : vec3 = vec3.scale(vec3.create(), vec3.add(vec3.create(), endNode.object.position, startNode.object.position), 1/2);
            this.delete();
            this.insert();
            // @ts-ignore
            this.selected.object.position = pos;
            // @ts-ignore
            this.connect(this.selected, endNode);            
            // @ts-ignore
            this.connect(startNode, this.selected);
            // @ts-ignore
            this._verticalArrows.position = this.selected.object.position;
            // @ts-ignore
            this._planeArrows.position = this.selected.object.position;
        }
    }

    private connected(prev : Node, next : Node) : boolean{
        return (((prev.next instanceof Node) && ((prev.next === next.next) || (prev.next === next.prev))) || ((prev.prev instanceof Node) && ((prev.prev === next.next) || (prev.prev === next.prev))));

    }


    public delete(object : Node | Edge | null = this.selected){

        if(object instanceof Node){
            
            this._nodeStack.delete(object);
            this.nodeNum--;
            if(object.prevCur){
                this._edgeStack.delete(object.prevCur);
                this.edgeNum--;
            }
            if(object.curNext){
                this._edgeStack.delete(object.curNext);
                this.edgeNum--;
            }
            object.delete();
        }
        else if(object instanceof Edge){
            object.delete();
            this._edgeStack.delete(object);
            this.edgeNum--;
        }

        this.selected = null;
        this.checkKnot();
    }

    private static reverse(node : Node){
        var prev : Node;
        var curr : Node | null =  node;
    
        if(node.next){
            do{
                prev = curr;
                curr = curr.next;

                prev.curNext?.reverse();
                prev.reverse();

            }while(curr)
        }else if(node.prev){
            do{

                prev = curr;
                curr = curr.prev;

                prev.prevCur?.reverse();
                prev.reverse();

            }while(curr)
        }
        

    }

    public checkKnot(){
        if((this.nodeNum == this.edgeNum) && (this.nodeNum > 2)){

            var first : Node | null = null;

    
            for(let i =0; i < this._nodeStack.data.length; i++){
                if(this._nodeStack.data[i] !== null)
                {
                    first = this._nodeStack.data[i];
                    break;
                }
            }

            var temp : Node | null | undefined = first?.next;
    
            for(let i = 1; i< this.nodeNum; i++){
                if(!temp){
                    this._isKnot =  false;
                    return;
                }
                if(first === temp){
                    this._isKnot =  false;
                    return;
                }
                temp = temp.next;
            }

            this._isKnot = true;
            return;
        }else{
            this._isKnot =  false;
        }
        
    }


    public draw(gl : WebGLRenderingContext, program : WebGLProgram){

        var temp : Node | Edge | null;
        for(let i = 0; i < this._nodeStack.data.length; i++){

            temp = this._nodeStack.data[i];
            if(temp){
                temp.object.draw(gl, program);
                
            }
        }
        for(let i = 0; i < this._edgeStack.data.length; i++){

            temp = this._edgeStack.data[i];
            if(temp){
                temp.object.draw(gl, program);
            }
        }


            // gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.depthMask(false);

        this._xyPlane.draw(gl, program);
        if(this.selectedNode){
            if(this.transform_z){
                this._verticalArrows.draw(gl, program);
            }else{
                this._planeArrows.draw(gl, program);
            }
            this._guide.draw(gl, program);
        }

        gl.disable(gl.BLEND);
        gl.depthMask(true);
    

    }

    get isEmpty(){
        return (this.nodeNum == 0 && this.edgeNum == 0);
    }

    get isKnot(){
        return this._isKnot;
    }
    get nodeArr(){
        var first : Node | null = null;

        for(let i =0; i < this._nodeStack.data.length; i++){
            if(this._nodeStack.data[i] !== null)
            {
                first = this._nodeStack.data[i];
                break;
            }
        }

        var temp : Node | null | undefined = first?.next;
        this._nodeArr = [];
        this._nodeArr.push(first!.object.position);

    
        for(let i = 1; i< this.nodeNum; i++){
            if(!temp){
                this._isKnot =  false;
                alert("not a knot");
                return;
            }
            this._nodeArr.push(temp.object.position);

            if(first === temp){
                this._isKnot =  false;
                return;
            }
            temp = temp.next;
        }
        return this._nodeArr;
    }

    get selectedNode(){
        return (this.selected instanceof Node);
    }

    get selected(){
        return this._selected;
    }

    set selected(obj: Node | Edge | null){
        if(this.selected instanceof Node){
            this.selected.object.changeColor(vec3.subtract(vec3.create(), this.selected.object.color, [0.18,0.18,0.18]));
        }else if(this.selected instanceof Edge){
            this.selected.object.changeColor(vec3.subtract(vec3.create(), this.selected.object.color, [0.18,0.18,0.18]));
        }
        
        this._selected = obj;

        if(this.selected instanceof Node){
            this.selected.object.changeColor(vec3.add(vec3.create(), this.selected.object.color, [0.18,0.18,0.18]));
            // @ts-ignore
            this._verticalArrows.position = this.selected.object.position;
            // @ts-ignore
            this._planeArrows.position = this.selected.object.position;
            // @ts-ignore
            this._guide.position = this.selected.object.position;
        }else if(this.selected instanceof Edge){
            this.selected.object.changeColor(vec3.add(vec3.create(), this.selected.object.color, [0.18,0.18,0.18]));
        }
        
    }

    get drawingTool(){
        return this._drawingTool;
    }

    get nodeNum(){
        return this._nodeNum;
    }

    set nodeNum(num : number){
        this._nodeNum = num;
    }

    get edgeNum(){
        return this._edgeNum;
    }

    set edgeNum(num : number){
        this._edgeNum = num;
    }

    get transform_z(){
        return this._transform_z;
    }

    set transform_z(bool : boolean){
        this._transform_z = bool;
    }


    public setDrawState(render: boolean){
        if(render){
            this._nodeStack.data.forEach(
                function(value){
                    if(value)
                    {
                        value.object.drawState();
                    }
                }
            )
            this._edgeStack.data.forEach(
                function(value){
                    if(value)
                    {
                        value.object.drawState();
                    }
                }
            )
        }else{
            this._nodeStack.data.forEach(
                function(value){
                    if(value)
                    {
                        value.object.readState();
                    }
                }
            )
            this._edgeStack.data.forEach(
                function(value){
                    if(value)
                    {
                        value.object.readState();
                    }
                }
            )
        }
    }


    public btnManager(){
        if(this.drawingTool.insert){
            if(this._overlapNode && (this.selected instanceof Node)){
                this.delete();
                this.selected = this._overlapNode;
            }
            //@ts-ignore
            this.insert();
            this.drawingTool.insert = true;
        }else if(this.drawingTool.connectFirst){
            if(this._overlapNode && (this.selected instanceof Node)){
                this.delete();
                this.selected = this._overlapNode;
            }
            //@ts-ignore
            const temp : Node = this.selected;
            this.insert();
            //@ts-ignore
            this.connect(temp, this.selected);

            this.drawingTool.connectFirst = false;
        }else if(this.drawingTool.connectLast){
            if(this.selected instanceof Node){
                var temp : Node | null = null;

                if(this._overlapNode){
                    if(this.selected.prev){
                        temp = this.selected.prev;
                    }else if(this.selected.next){
                        temp = this.selected.next;
                    }
                    this.delete();
                    this.selected = this._overlapNode;
                    if(temp){
                        //@ts-ignore
                        this.connect(temp, this.selected);
                    }
                    
                    if(this.selected.next && this.selected.prev){
                        this.drawingTool.connectLast = false;
                        return;
                    }
                }
                temp = this.selected;
                this.insert();
                //@ts-ignore
                this.connect(temp, this.selected);

            }
        }

    }

    public moveNode(vec: vec3, absPos: vec3, normal : vec2)
    {
        if(this.selected instanceof Node){

            var updatedPos : vec3 = vec3.create();
            vec3.copy(updatedPos, this.selected.object.position);
            const diff : vec3 = vec3.subtract(vec3.create(), absPos, this.selected.object.position);
            
            if(this.transform_z){
                const dist  = vec2.dot(normal, [diff[0], diff[1]]);
    
                updatedPos[2] = vec[2]*(-dist/vec2.dot([vec[0], vec[1]], normal)) + absPos[2];

                updatedPos[2] = Math.max(-5, Math.min(5, updatedPos[2]));

            }else{
                const t = -diff[2]/vec[2];

                updatedPos[0] = vec[0] * t + absPos[0];
                updatedPos[1] = vec[1] * t + absPos[1];

                updatedPos[0] = Math.max(-5, Math.min(5, updatedPos[0]));
                updatedPos[1] = Math.max(-5, Math.min(5, updatedPos[1]));
            }

            this.selected.object.position = updatedPos;

            if(this.drawingTool.insert || this.drawingTool.connectLast){
                this.overlapping(vec3.normalize(vec3.create(), vec), absPos);
                if(this._overlapNode){
                    this.selected.object.position = this._overlapNode.object.position;
                }
            }
            
            this.selected.prevCur?.updatePos(); 
            this.selected.curNext?.updatePos();
        
            this._verticalArrows.position = this.selected.object.position;
            this._planeArrows.position = this.selected.object.position;
            this._guide.position = this.selected.object.position;
        }
    }

    private overlapping(vec: vec3, absPos : vec3){
        if(this.selected instanceof Node){
            var adjNode : Node | null;
            var dist : number;
            var pos : vec3;
            for(let i = 0; i < this._nodeStack.data.length; i++){
                adjNode = this._nodeStack.data[i];
                if(adjNode){
                    if((adjNode === this.selected) || (adjNode === this.selected.prev) || (adjNode === this.selected.next) || this.connected(adjNode, this.selected)){
                        continue;
                    }
                    if(!adjNode.prevCur || !adjNode.curNext){
                        dist = vec3.distance(absPos, adjNode.object.position);
                        pos = vec3.add(vec3.create(), vec3.scale(vec3.create(), vec, dist), absPos);
                        if(vec3.distance(adjNode.object.position, pos) < adjacent){
                            this._overlapNode = adjNode;
                            return;
                        }
                    }

                }
            }
        }
        this._overlapNode = null;
    }

    public pickObj(vec: vec3, absPos: vec3){

        this._overlapNode = null;
        this.selected = null;
        
        var temp : Node | Edge | null;
        var tempPos : vec3 = vec3.create();
        var minTempPos : number = 100;
        var n : vec3 = vec3.create();
        var dist : vec3 = vec3.create();

        for(let i = 0; i < this._nodeStack.data.length; i++){
            temp = this._nodeStack.data[i];
            if(temp){
                //@ts-ignore
                vec3.subtract(tempPos, temp.object.position, absPos);
                vec3.normalize(n, vec);
                vec3.scaleAndAdd(dist, tempPos, n, -vec3.dot(n, tempPos));
                
                if(vec3.length(dist)<0.12){
                    if(minTempPos > vec3.len(tempPos)){
                        this.selected = temp;
                        minTempPos = vec3.len(tempPos);
                    }
                }
            }
        }
        if(!this.selected){
            for(let i = 0; i < this._edgeStack.data.length; i++){
                temp = this._edgeStack.data[i];
                if(temp){
                    //@ts-ignore
                    vec3.subtract(tempPos, temp.object.end, temp.object.start);
                    vec3.cross(n, tempPos, vec);

                    if(vec3.len(n)< 0.001){
                        continue;
                    }else{
                        //@ts-ignore
                        vec3.subtract(dist, absPos, temp.object.start);
                        vec3.normalize(n,n);
                        if(Math.abs(vec3.dot(n, dist)) < 0.12){
                            vec3.cross(n, vec, n);
                            //@ts-ignore
                            const c = vec3.dot(dist, n)/vec3.dot(n, tempPos);
                            if((c>0) && (c<1)){
                                //@ts-ignore
                                const closest = vec3.subtract(vec3.create(), vec3.scaleAndAdd(vec3.create(), temp.object.start, tempPos, c), absPos)
                                if(minTempPos > vec3.len(closest)){
                                    this.selected = temp;
                                    minTempPos = vec3.len(closest);
                                }

                            }
                        }
                    }
                    
                    
                }
            }
        }
        

        if(this.drawingTool.erase){
            this.delete();
            if(this.isEmpty){
                this.drawingTool.erase = false;
            }
        }else if(this.drawingTool.subdivide){
            this.subdivide();
            if(this.selectedNode){
                this.drawingTool.subdivide = false;
            }
        }

    }

}


class Stack{
    private _data : any[];

    public constructor(){
        /*
            A stack object.
        */
        this._data = [];
    }

    public insert(object : any, index : number){
        /*
            insert object at given index.
        */
        if (index < this._data.length){
            this._data[index] = object;
        } else{
            this._data.push(object);
        }
    }
    public free(index : number){
        /*
           free an index
        */
        this._data[index] = null;
    }

    public delete(obj : Node | Edge){
        for(let i =0; i < this._data.length; i++){
            if(this._data[i] === obj){
                this._data[i] = null;
            }
        }
    }
    public available(): number{
        /*
           returns the smallest index at which the stack is empty
        */
        for(let i =0; i < this._data.length; i++){
            if (!this._data[i]){
                return i;
            }
        }
        return this._data.length;
    }

    get data() : any[]{
        return this._data;
    }

}

export class Edge {

    private _object : Cylinder;
    private _startNode : Node;
    private _endNode : Node;



    public constructor(
            start : Node, 
            end : Node,
        ){

        const color : [number, number, number] = [0.4, 0.4, 0.4]

        this._startNode = start;
        this._endNode = end;

        this._startNode.curNext = this;
        this._startNode.next = this._endNode;

        this._endNode.prevCur = this;
        this._endNode.prev = this._startNode;


        this._object = new Cylinder(
            color,
            this._startNode.object.position,
            this._endNode.object.position)
    }

    public delete(){
        this._startNode.next = null;
        this._endNode.prev = null;
        this._startNode.curNext = null;
        this._endNode.prevCur = null;
    }

    public updatePos(){
        this.object.start = this._startNode.object.position;
        this.object.end = this._endNode.object.position;
    }

    public reverse(){
        const temp = this._startNode;
        this._startNode = this._endNode;
        this._endNode = temp;
    }

    get object() : Cylinder{
        return this._object;
    }

    get startNode(){
        return this._startNode;
    }

    set startNode(node : Node){
        this._startNode = node;
    }

    get endNode(){
        return this._endNode;
    }

    set endNode(node : Node){
        this._endNode = node;
    }



}


export class Node {

    private _object : Sphere;
    private _next : Node | null;
    private _prev : Node | null;
    
    private _prevCur : Edge | null;
    private _curNext : Edge | null;




    public constructor(
            pos : vec3 = vec3.fromValues(0,0,0),
            prev : Node | null = null, 
            next : Node | null = null
        ){

        const color : [number, number, number] = [42, 106, 209];
        this._object = new Sphere(vec3.scale(vec3.create(), color, 1/255), 0.1, pos);

        this._prev = prev;
        this._next = next;


        this._curNext = null;
        this._prevCur = null;
        
    }

    public delete(){
        this._prevCur?.delete();
        this._curNext?.delete();
    }

    public reverse(){
        const tempNode = this._next;
        this._next = this._prev;
        this._prev = tempNode;

        const tempEdge = this._curNext;
        this._curNext = this._prevCur;
        this._prevCur = tempEdge;
    }

    get object() : Sphere{
        return this._object;
    }



    get next(): Node | null{
        return this._next;
    }
    
    get prev(): Node | null{
        return this._prev;
    }

    get prevCur(): Edge | null{
        return this._prevCur;
    }
    
    get curNext(): Edge | null{
        return this._curNext;
    }


    set next(node : Node | null){
        this._next = node;
    }
    set prev(node : Node | null){
        this._prev = node;
    }

    set prevCur(edge : Edge | null){
        this._prevCur = edge;
    }
    set curNext(edge : Edge | null){
        this._curNext = edge;
    }
    
}


export class DrawingTool{
    
    private _overlay : HTMLElement;
    private _insertBtn : HTMLElement;
    private _connectBtn : HTMLElement;
    private _subdivideBtn : HTMLElement;
    private _eraseBtn : HTMLElement;
    private _insert : boolean;
    private _connectFirst : boolean;
    private _connectLast : boolean;
    private _subdivide : boolean;
    private _erase : boolean;

    private _linkedKnot : LinkedKnot;
    

    constructor(linkedKnot : LinkedKnot){
        this._linkedKnot = linkedKnot;

        this._overlay = <HTMLElement>document.getElementById("drawing tool");
        this._insertBtn = <HTMLElement>document.getElementById("insert button");
        this._connectBtn = <HTMLElement>document.getElementById("connect button");
        this._subdivideBtn = <HTMLElement>document.getElementById("subdivide button");
        this._eraseBtn = <HTMLElement>document.getElementById("erase button");
        this._insert = false;
        this._connectFirst = false;
        this._connectLast = false;
        this._subdivide = false;
        this._erase = false;

    }

    public initCallback(){
        
        this._overlay.addEventListener('mousedown', (event : MouseEvent) => {this.resize(event);})

        this._insertBtn.addEventListener('click', () => {this.insertBtnResponse();});
        this._connectBtn.addEventListener('click', () => {this.connectBtnResponse();});
        this._eraseBtn.addEventListener('click', () => {this.eraseBtnResponse();});
        this._subdivideBtn.addEventListener('click', () => {this.subdivideBtnResponse();});

    }

    public reset(){
        this.insert = false;
        this.connectLast = false;
        this.subdivide = false;
        this.erase = false;
    }

    private insertBtnResponse(){
        if(this.linkedKnot.nodeNum > 254){
            alert("cannot have more than 255 nodes");
            return;
        }
        
        this.insert = !this.insert;

        if(this.insert){
            this.linkedKnot.transform_z = false;
            if(this.connectFirst){
                this.connectLast = false;
                return;
            }else if(this.connectLast){
                this.linkedKnot.delete();
            }
            this.linkedKnot.insert();
        }else{
            this.linkedKnot.delete();
        }

        this.erase = false;
        this.connectLast = false;
        this.subdivide = false;
    }

    private connectBtnResponse(){
        if(this.linkedKnot.nodeNum > 254){
            alert("cannot have more than 255 nodes");
            return;
        }
        
        this.connectLast = !this.connectLast;

        if(this.connectLast){
            this.linkedKnot.transform_z = false;
            if(!this.insert){
                this.linkedKnot.insert();
            }
        }else{
            this.linkedKnot.delete();
        }

        this.insert = false;
        this.erase = false;
        this.subdivide = false;


    }

    private eraseBtnResponse(){
        this.erase = !this.erase;

        if(this.erase){
            if(this.connectLast){
                this.linkedKnot.delete();
            }else if(this.insert){
                this.linkedKnot.delete();
            }
            this.linkedKnot.selected = null;
        }

        this.insert = false;
        this.connectLast = false;
        this.subdivide = false;
    }

    private subdivideBtnResponse(){
        this.subdivide = !this.subdivide;

        if(this.subdivide){
            if(this.connectLast){
                this.linkedKnot.delete();
            }else if(this.insert){
                this.linkedKnot.delete();
            }
            this.linkedKnot.selected = null;
        }

        this.insert = false;
        this.connectLast = false;
        this.erase = false;
    }


    get insert(){
        return this._insert;
    }
    set insert(bool : boolean){
        this._insert = bool;
        this._insertBtn.classList.toggle('active', bool);
    }

    set connectLast(bool : boolean){
        this._connectLast = bool;
        this._connectFirst = bool;
        this._connectBtn.classList.toggle('active', bool);
    }

    set connectFirst(bool : boolean){
        this._connectFirst = bool;
    }

    get connectLast(){
        return this._connectLast;
    }

    get connectFirst(){
        return this._connectFirst;
    }

    get subdivide(){
        return this._subdivide;
    }

    set subdivide(bool : boolean){
        this._subdivide = bool;
        this._subdivideBtn.classList.toggle('active', bool);
    }

    set erase(bool : boolean){
        this._erase = bool;
        this._eraseBtn.classList.toggle('active', bool);
    }

    get erase(){
        return this._erase;
    }
    
    get linkedKnot(){
        return this._linkedKnot;
    }
    
    public Disable(disable : boolean){
        
        this.insert = false;
        this.connectLast = false;
        this.subdivide = false;
        this.erase = false;

        if(disable === true){
            this._overlay.classList.toggle('hidden', true);
        } else {
            this._overlay.classList.toggle('hidden', false);
        }
    }

    private resize(event : MouseEvent){
        if ((event.offsetY >= 75) && (event.offsetX < 240) && (event.offsetX > 160)) {
            if(this._overlay.style.transform === "translate(0px, -80%)"){
                this._overlay.style.transform = "translate(0px, -0%)";
            }else{
                this._overlay.style.transform = "translate(0px, -80%)";
            }
        }
    }
    
}