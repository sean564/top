export abstract class uiUtils{

    public static inCanvas(event : MouseEvent): boolean {
        var x = event.clientX;
        var y = event.clientY;
        var target = <HTMLElement>event.target;
        var rect = target.getBoundingClientRect();
        return (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom);
    }
    public static pixelInputToGLCoord(event : MouseEvent, rect : DOMRect): {relx:number, rely:number} {
        var x = event.clientX;
        var y = event.clientY;
        var midX = (rect.width)/2;
        var midY = (rect.height)/2;

        x = ((x - rect.left) - midX) / midX;
        y = (midY - (y - rect.top)) / midY;
        return {relx:x,rely:y};
    }
    private static pixelInputToCanvasCoord(event : MouseEvent, canvas : HTMLCanvasElement): {x:number, y:number}  {
        var x = event.clientX;
        var y = event.clientY;
        var rect = canvas.getBoundingClientRect();
        x = x - rect.left;
        y = rect.bottom - y;
        return {x:x,y:y};
    }
    public static pixelsFromMouseClick(event : MouseEvent, canvas : HTMLCanvasElement, gl: WebGLRenderingContext) {
        var point = uiUtils.pixelInputToCanvasCoord(event, canvas);
        var pixels = new Uint8Array(4);
        gl.readPixels(point.x, point.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return pixels;
    }
    
}
