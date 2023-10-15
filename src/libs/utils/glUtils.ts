

export abstract class glUtils{

    public static checkWebGL(canvas : HTMLCanvasElement) : WebGLRenderingContext | null{
        /**
         * Check if WebGL is available.
         **/
        const contexts : string[] = ["experimental-webgl", "webkit-3d", "moz-webgl"]
        var gl : WebGLRenderingContext | null = <WebGLRenderingContext>canvas.getContext("webgl", { preserveDrawingBuffer: true });
        if (!gl) {
            for (var i=0; i < contexts.length; i++) {
                try {
                  gl = <WebGLRenderingContext>canvas.getContext(contexts[i], { preserveDrawingBuffer: true });
                } catch(e) {}
                if (gl) {
                  break;
                }
            }
        }
        if (!gl) {
          alert("WebGL not available. Please use a new version of Chrome or Firefox.");
          throw new Error("WebGL not available. Please use a new version of Chrome or Firefox.")
        }
        return gl;
    }

    public static createProgram(
            gl: WebGLRenderingContext, 
            vertexShaderSource : string, 
            fragmentShaderSource : string
        ): WebGLProgram | null {
        /**
         * Create and return a shader program
         **/
        var program : WebGLProgram = <WebGLProgram>gl.createProgram();
        var vertexShader : WebGLShader = <WebGLShader>glUtils.getShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        var fragmentShader : WebGLShader = <WebGLShader>glUtils.getShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
  
        // Check that shader program was able to link to WebGL
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            var error = gl.getProgramInfoLog(program);
            console.log('Failed to link program: ' + error);
            gl.deleteProgram(program);
            gl.deleteShader(fragmentShader);
            gl.deleteShader(vertexShader);
            return null;
        }
        
        return program;
    }

        // Render buffers for all the attributes
    public static renderBuffers(
            gl : WebGLRenderingContext, 
            program : WebGLProgram, 
            attributes : { [name: string]: Attribute }, 
            indices : Uint8Array | Uint16Array | null = null
        ): void{


        let attributeCount : number = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < attributeCount; ++i ) {
            let info: WebGLActiveInfo = <WebGLActiveInfo>gl.getActiveAttrib(program, i );
            if ( !info ) {
                break;
            }
            var objAttribute : Attribute = attributes[info.name];
            var buffer : WebGLBuffer = <WebGLBuffer> gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, objAttribute.bufferData, gl.STATIC_DRAW);
            var attr = gl.getAttribLocation(program, info.name);
            gl.enableVertexAttribArray(attr);
            gl.vertexAttribPointer(
                attr,
                objAttribute.size,
                gl.FLOAT,
                false,
                0,
                objAttribute.bufferData.BYTES_PER_ELEMENT*objAttribute.offset
            );
        }
        

        if (indices) {
            var indexBuffer : WebGLBuffer = <WebGLBuffer>gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        }
    }

    public static bindBuffers(
        gl : WebGLRenderingContext, 
        program : WebGLProgram, 
        attributes : { [name: string]: Attribute }, 
        buffers: { [name: string]: WebGLBuffer},
        indexBuffer : WebGLBuffer | null = null,
    ): void{
        let attributeCount : number = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < attributeCount; ++i ) {
            let info: WebGLActiveInfo = <WebGLActiveInfo>gl.getActiveAttrib(program, i );
            if ( !info ) {
                break;
            }

            var objAttribute : Attribute = attributes[info.name];
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers[info.name]);
            var attr = gl.getAttribLocation(program, info.name);
            gl.enableVertexAttribArray(attr);
            gl.vertexAttribPointer(
                attr,
                objAttribute.size,
                gl.FLOAT,
                false,
                0,
                objAttribute.bufferData.BYTES_PER_ELEMENT*objAttribute.offset
            );
        
        }
        if (indexBuffer) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        }
    }

    public static initBuffers(
        gl : WebGLRenderingContext, 
        program : WebGLProgram, 
        attributes : { [name: string]: Attribute }, 
        indices : Uint8Array | Uint16Array | null = null
    ): [{ [name: string]: WebGLBuffer}, WebGLBuffer | null]{


        let attributeCount : number = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        var buffers: { [name: string]: WebGLBuffer} = {};
        for (let i = 0; i < attributeCount; ++i ) {
            let info: WebGLActiveInfo = <WebGLActiveInfo>gl.getActiveAttrib(program, i );
            if ( !info ) {
                break;
            }

            var objAttribute : Attribute = attributes[info.name];
            buffers[info.name] = <WebGLBuffer> gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers[info.name]);
            gl.bufferData(gl.ARRAY_BUFFER, objAttribute.bufferData, gl.STATIC_DRAW);
            var attr = gl.getAttribLocation(program, info.name);
            gl.enableVertexAttribArray(attr);
            gl.vertexAttribPointer(
                attr,
                objAttribute.size,
                gl.FLOAT,
                false,
                0,
                objAttribute.bufferData.BYTES_PER_ELEMENT*objAttribute.offset
            );
        }
        
        var indexBuffer : WebGLBuffer | null = null;
        if (indices) {
            indexBuffer = <WebGLBuffer>gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        }
        return [buffers, indexBuffer];
    }
  
    private static getShader(gl : WebGLRenderingContext, type : number, source : string): WebGLShader | null {
        /**
         * Get, compile, and return an embedded shader object
         **/
        var shader : WebGLShader = <WebGLShader>gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
  
        // Check if compiled successfully
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log("An error occurred compiling the shaders:" + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
  
        return shader;
    }
  
};
  
    
  
