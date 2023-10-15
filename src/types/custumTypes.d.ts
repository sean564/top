
type Attribute = {
    size : number;
    offset : number;
    bufferData : Float32Array;
}


type Frames = {
    redPoints : {
        position : vec3;
    };
    blackPoints : {
        position : vec3;
    }[];
    circles : {
        center : vec3;
        normal :vec3;
        radius : number;
        radID : number;
    }[];
}[];




