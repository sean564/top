import { vec3 } from "gl-matrix";
export abstract class Light{


    public static setLight(gl : WebGLRenderingContext, program : WebGLProgram, pos: [number, number, number] = [50, 50, 50]){

        var light_pos = vec3.normalize(vec3.create(), pos);
        
        var uAmbientLight = <WebGLUniformLocation>gl.getUniformLocation(program, 'uAmbientLight');
        var uDiffuseLight = <WebGLUniformLocation>gl.getUniformLocation(program, 'uDiffuseLight');
        var uLightPosition = <WebGLUniformLocation>gl.getUniformLocation(program, 'uLightPosition');

        gl.uniform3f(uAmbientLight, 0.75, 0.75, 0.75);
        gl.uniform3f(uDiffuseLight, 0.35, 0.35, 0.35);
        gl.uniform3f(uLightPosition, light_pos[0], light_pos[1], light_pos[2]);

    }

}