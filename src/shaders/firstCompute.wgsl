


struct fourier_series {
    cos : array<vec3f, 6>,
    sin : array<vec3f, 6>,
};


@group(0) @binding(0)var<uniform> knot_info: fourier_series;
@group(0) @binding(1)var<storage, read> tlist: array<f32>;
@group(0) @binding(2)var<storage, read_write> output: array<f32>;


const PI : f32 = 3.1415926535897932384626433832795;
const error_field : f32 = 0.0025;
const grad_stop_double : f32 = 0.00001;
const ptol_stop_double : f32 = 0.001;

const MAX_ITER : i32 = 150;
override BUFFER_SIZE : u32 = 5985 * 100;

var<workgroup> t_i : array<array<f32, 5>, 16>;

var<workgroup> abort : array<bool, 16>;

var<workgroup> vv : array<array<vec3f, 16>, 16>;
var<workgroup> nv : array<array<f32, 16>, 16>;
var<workgroup> dv : array<array<vec3f, 4>, 16>;
var<workgroup> d2v : array<array<vec3f, 4>, 16>;

var<workgroup> ptol : array<f32, 16>;
var<workgroup> grad : array<array<f32, 4>, 16>;
var<workgroup> hess : array<array<f32, 16>, 16>;


var<workgroup> diff : array<array<f32, 4>, 16>;
var<workgroup> backtrack : array<array<u32, 16>, 16>;


fn set_variables(x_index : u32, z_index : u32){

    for(var i : u32 = 0; i<4; i++){
        vv[z_index][x_index + 4*i] = (
            knotc(t_i[z_index][x_index + 1]) 
            - knotc(t_i[z_index][i])
        );
    }

    vv[z_index][9] = -vv[z_index][11];
    vv[z_index][14] = -vv[z_index][15];

    for(var i : u32 = 0; i<4; i++){
        nv[z_index][x_index + 4*i] = length(vv[z_index][x_index + 4*i]);
    }


    if(
        (nv[z_index][0] < error_field) ||
        (nv[z_index][1] < error_field) ||
        (nv[z_index][2] < error_field) ||
        (nv[z_index][3] < error_field) ||
        (nv[z_index][5] < error_field) ||
        (nv[z_index][6] < error_field) ||
        (nv[z_index][10] < error_field) ||
        (nv[z_index][11] < error_field) ||
        (nv[z_index][15] < error_field)){
        abort[z_index] = true;
    }


    ptol[z_index] = nv[z_index][2]*nv[z_index][5]+nv[z_index][6]*nv[z_index][1]-nv[z_index][0]*nv[z_index][10] 
                    +nv[z_index][2]*nv[z_index][11]+nv[z_index][1]*nv[z_index][15]-nv[z_index][3]*nv[z_index][10];


    dv[z_index][x_index] = knotd(t_i[z_index][x_index + 1]);
    d2v[z_index][x_index] = knotd2(t_i[z_index][x_index + 1]);

}
    
fn grad_compute(x : u32, z_index : u32){

    var sgn : array<f32, 3>;

    var index1 : array<u32, 3>;
    var index2 : array<u32, 3>;

    let dvv : vec3f = dv[z_index][x];

    index2[0] = 1;

    switch x {
        case 0: {
            index1[0] = 10;   index1[1] = 2;   index1[2] = 1;
            index2[0] = 0;   index2[1] = 8;   index2[2] = 12;
            sgn[0] = f32(-1);   sgn[1] = f32(1);   sgn[2] = f32(1);

        }
        case 1: {
            index1[0] = 6;   index1[1] = 0;   index1[2] = 2;
            index2[0] = 1;   index2[1] = 13;   index2[2] = 5;
            sgn[0] = f32(1);   sgn[1] = f32(-1);   sgn[2] = f32(1);

        }
        case 2: {
            index1[0] = 5;   index1[1] = 1;   index1[2] = 0;
            index2[0] = 2;   index2[1] = 6;   index2[2] = 10;
            sgn[0] = f32(1);   sgn[1] = f32(1);   sgn[2] = f32(-1);

        }
        default {
            sgn[0] = f32(0);   sgn[1] = f32(0);   sgn[2] = f32(0);
        }
    }

    

    let dptol1423 : f32= (
        sgn[0]*(nv[z_index][index1[0]]/nv[z_index][index2[0]])*dot(vv[z_index][index2[0]],dvv) 
        + sgn[1]*(nv[z_index][index1[1]]/nv[z_index][index2[1]])*dot(vv[z_index][index2[1]],dvv)
        + sgn[2]*(nv[z_index][index1[2]]/nv[z_index][index2[2]])*dot(vv[z_index][index2[2]],dvv)
    );

    switch x {
        case 1: {
            index1[0] = 3;   index1[1] = 2;   index1[2] = 15;
            index2[0] = 13;   index2[1] = 9;   index2[2] = 1;
            sgn[0] = f32(-1);   sgn[1] = f32(1);   sgn[2] = f32(1);

        }
        case 2: {
            index1[0] = 1;   index1[1] = 3;   index1[2] = 11;
            index2[0] = 14;   index2[1] = 10;   index2[2] = 2;
            sgn[0] = f32(1);   sgn[1] = f32(-1);   sgn[2] = f32(1);

        }
        case 3: {
            index1[0] = 2;   index1[1] = 1;   index1[2] = 10;
            index2[0] = 11;   index2[1] = 15;   index2[2] = 3;
            sgn[0] = f32(1);   sgn[1] = f32(1);   sgn[2] = f32(-1);

        }
        default {
            sgn[0] = f32(0);   sgn[1] = f32(0);   sgn[2] = f32(0);
        }
    }


    let dptol1453 : f32 = (
        sgn[0]*(nv[z_index][index1[0]]/nv[z_index][index2[0]])*dot(vv[z_index][index2[0]],dvv) 
        + sgn[1]*(nv[z_index][index1[1]]/nv[z_index][index2[1]])*dot(vv[z_index][index2[1]],dvv)
        + sgn[2]*(nv[z_index][index1[2]]/nv[z_index][index2[2]])*dot(vv[z_index][index2[2]],dvv)
    );


    grad[z_index][x] = dptol1423 + dptol1453;

}

fn hess_compute(x : u32, z_index : u32){

    var sgn : array<f32, 3>;
    
    var index1 : array<u32, 2>;
    var index2 : array<u32, 2>;
    var index3 : array<u32, 2>;

    let dvv : vec3f = dv[z_index][x];
    let dvdv : f32 = dot(dvv,dvv);
    let d2vv : vec3f = d2v[z_index][x];
    
    index1[1] = 1;


    switch x {
        case 0: {
            index1[0] = 10;     index1[1] = 0;
            index2[0] = 2;      index2[1] = 8;      
            index3[0] = 1;      index3[1] = 12;
            sgn[0] = f32(-1);   sgn[1] = f32(1);   sgn[2] = f32(1);

        }
        case 1: {
            index1[0] = 6;     index1[1] = 1;
            index2[0] = 0;      index2[1] = 13;      
            index3[0] = 2;      index3[1] = 5;
            sgn[0] = f32(1);   sgn[1] = f32(-1);   sgn[2] = f32(1);

        }
        case 2: {
            index1[0] = 5;     index1[1] = 2;
            index2[0] = 1;      index2[1] = 6;      
            index3[0] = 0;      index3[1] = 10;
            sgn[0] = f32(1);   sgn[1] = f32(1);   sgn[2] = f32(-1);

        }
        default {
            sgn[0] = f32(0);   sgn[1] = f32(0);   sgn[2] = f32(0);
        }
    }
    

    let d2ptol1423_diag : f32 = (
        sgn[0]*(nv[z_index][index1[0]]/nv[z_index][index1[1]])*(dot(vv[z_index][index1[1]],d2vv) + dvdv - pow(dot(vv[z_index][index1[1]],dvv), f32(2))/(pow(nv[z_index][index1[1]], f32(2))))
        + sgn[1]*(nv[z_index][index2[0]]/nv[z_index][index2[1]])*(dot(vv[z_index][index2[1]],d2vv) + dvdv - pow(dot(vv[z_index][index2[1]],dvv), f32(2))/(pow(nv[z_index][index2[1]], f32(2))))
        + sgn[2]*(nv[z_index][index3[0]]/nv[z_index][index3[1]])*(dot(vv[z_index][index3[1]],d2vv) + dvdv - pow(dot(vv[z_index][index3[1]],dvv), f32(2))/(pow(nv[z_index][index3[1]], f32(2))))
    );

    switch x {
        case 1: {
            index1[0] = 3;     index1[1] = 13;
            index2[0] = 2;      index2[1] = 9;      
            index3[0] = 15;      index3[1] = 1;
            sgn[0] = f32(-1);   sgn[1] = f32(1);   sgn[2] = f32(1);

        }
        case 2: {
            index1[0] = 1;     index1[1] = 14;
            index2[0] = 3;      index2[1] = 10;      
            index3[0] = 11;      index3[1] = 2;
            sgn[0] = f32(1);   sgn[1] = f32(-1);   sgn[2] = f32(1);

        }
        case 3: {
            index1[0] = 2;     index1[1] = 11;
            index2[0] = 1;      index2[1] = 15;      
            index3[0] = 10;      index3[1] = 3;
            sgn[0] = f32(1);   sgn[1] = f32(1);   sgn[2] = f32(-1);

        }
        default {
            sgn[0] = f32(0);   sgn[1] = f32(0);   sgn[2] = f32(0);
        }
    }
    

    let d2ptol1453_diag : f32 = (
        sgn[0]*(nv[z_index][index1[0]]/nv[z_index][index1[1]])*(dot(vv[z_index][index1[1]],d2vv) + dvdv - pow(dot(vv[z_index][index1[1]],dvv), f32(2))/(pow(nv[z_index][index1[1]], f32(2))))
        + sgn[1]*(nv[z_index][index2[0]]/nv[z_index][index2[1]])*(dot(vv[z_index][index2[1]],d2vv) + dvdv - pow(dot(vv[z_index][index2[1]],dvv), f32(2))/(pow(nv[z_index][index2[1]], f32(2))))
        + sgn[2]*(nv[z_index][index3[0]]/nv[z_index][index3[1]])*(dot(vv[z_index][index3[1]],d2vv) + dvdv - pow(dot(vv[z_index][index3[1]],dvv), f32(2))/(pow(nv[z_index][index3[1]], f32(2))))
    );

    hess[z_index][x + 4*x] = d2ptol1423_diag + d2ptol1453_diag;

    
    var xindex : u32 = 1;
    var yindex : u32 = 1;



    switch x {
        case 1: {
            // block index 1
            index1[0] = 2;    index1[1] = 5;
            index2[0] = 10;    index2[1] = 0;    
            index3[0] = 1;    index3[1] = 6;  
            xindex = 1;
            yindex = 0;
            sgn[0] = f32(-1);   sgn[1] = f32(1);   sgn[2] = f32(-1);        

        }
        case 2: {
            // block index 2
            index1[0] = 1;    index1[1] = 6;
            index2[0] = 10;    index2[1] = 0;    
            index3[0] = 2;    index3[1] = 5;    
            xindex = 2;
            yindex = 0;
            sgn[0] = f32(-1);   sgn[1] = f32(-1);   sgn[2] = f32(-1);        

        }
        case 3: {
            // block index 6
            index1[0] = 0;    index1[1] = 10;
            index2[0] = 6;    index2[1] = 1;    
            index3[0] = 2;    index3[1] = 5;    
            xindex = 2;
            yindex = 1;
            sgn[0] = f32(1);   sgn[1] = f32(1);   sgn[2] = f32(1);        

        }
        default {
            sgn[0] = f32(0);   sgn[1] = f32(0);   sgn[2] = f32(0);
        }
    }
    

    let d2ptol1423_non_diag : f32 = (
        sgn[0]*(nv[z_index][index1[0]]/nv[z_index][index1[1]])*(dot(dv[z_index][xindex],dv[z_index][yindex]) - dot(vv[z_index][index1[1]],dv[z_index][xindex])*dot(vv[z_index][index1[1]],dv[z_index][yindex])/(nv[z_index][index1[1]]*nv[z_index][index1[1]]))
        + sgn[1]/(nv[z_index][index2[0]]*nv[z_index][index2[1]])*dot(vv[z_index][index2[0]],dv[z_index][xindex])*dot(vv[z_index][index2[1]],dv[z_index][yindex])
        + sgn[2]/(nv[z_index][index3[0]]*nv[z_index][index3[1]])*dot(vv[z_index][index3[0]],dv[z_index][xindex])*dot(vv[z_index][index3[1]],dv[z_index][yindex])
    );



    switch x {
        case 3: {
            // block index 6
            index1[0] = 3;    index1[1] = 10;
            index2[0] = 2;    index2[1] = 11;    
            index3[0] = 15;    index3[1] = 1;   
            xindex = 2;
            yindex = 1; 
            sgn[0] = f32(1);   sgn[1] = f32(-1);   sgn[2] = f32(-1);        

        }
        case 2: {
            // block index 7
            index1[0] = 2;    index1[1] = 11;
            index2[0] = 3;    index2[1] = 10;    
            index3[0] = 15;    index3[1] = 1;    
            xindex = 3;
            yindex = 1;
            sgn[0] = f32(-1);   sgn[1] = f32(1);   sgn[2] = f32(1);        

        }
        case 1: {
            // block index 11
            index1[0] = 1;    index1[1] = 15;
            index2[0] = 3;    index2[1] = 10;    
            index3[0] = 11;    index3[1] = 2;   
            xindex = 3;
            yindex = 2; 
            sgn[0] = f32(-1);   sgn[1] = f32(-1);   sgn[2] = f32(1);        

        }
        default {
            sgn[0] = f32(0);   sgn[1] = f32(0);   sgn[2] = f32(0);
        }
    }
    

    let d2ptol1453_non_diag : f32 = (
        sgn[0]*(nv[z_index][index1[0]]/nv[z_index][index1[1]])*(dot(dv[z_index][xindex],dv[z_index][yindex]) - dot(vv[z_index][index1[1]],dv[z_index][xindex])*dot(vv[z_index][index1[1]],dv[z_index][yindex])/(nv[z_index][index1[1]]*nv[z_index][index1[1]]))
        + sgn[1]/(nv[z_index][index2[0]]*nv[z_index][index2[1]])*dot(vv[z_index][index2[0]],dv[z_index][xindex])*dot(vv[z_index][index2[1]],dv[z_index][yindex])
        + sgn[2]/(nv[z_index][index3[0]]*nv[z_index][index3[1]])*dot(vv[z_index][index3[0]],dv[z_index][xindex])*dot(vv[z_index][index3[1]],dv[z_index][yindex])
    );


    switch x {
        case 3: {
            hess[z_index][6] = d2ptol1423_non_diag + d2ptol1453_non_diag;
            hess[z_index][9] = hess[z_index][6];
        }
        case 2: {
            hess[z_index][2] = d2ptol1423_non_diag;
            hess[z_index][7] = d2ptol1453_non_diag;
            hess[z_index][8] = hess[z_index][2];
            hess[z_index][13] = hess[z_index][7];

        }
        case 1: {
            hess[z_index][1] = d2ptol1423_non_diag;
            hess[z_index][11] = d2ptol1453_non_diag;
            hess[z_index][4] = hess[z_index][1];
            hess[z_index][14] = hess[z_index][11];

        }
        default {

        }

    }

}


// Workgroup size is 64 so that it is optimized for both AMD and Nvidia GPU. Each of the 16 entries in the y-axis essentially does the same calculations, and the x-axis is divided into four entries, where each entry does different calculations (e.g. each entry calculates each gradient term). 
// I found (4,16) to be the most optimal.

@compute @workgroup_size(4,16)
fn main(
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_id) local_invocation_id : vec3<u32>,
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
    @builtin(local_invocation_index) local_invocation_index: u32,
    @builtin(num_workgroups) num_workgroups: vec3<u32>
) {

    

    let workgroup_index = (
        workgroup_id.x +
        workgroup_id.y * num_workgroups.x +
        workgroup_id.z * num_workgroups.x * num_workgroups.y
    );
    
    let newton_index = (
        workgroup_index * 16 +
        local_invocation_id.y
    );
    


    let global_invocation_index = (
        workgroup_index * 64 +
        local_invocation_index
    );


    let tlist_index = (
        newton_index*5
    );



        // Avoid accessing the buffer out of bounds
    if (tlist_index >= BUFFER_SIZE) {
        return;
    }

    var grad_length: f32;

    var i : u32;
    var grad_dot_diff: f32;
    var func: f32;
    var min_backtrack : u32;

    var x_n : array<f32, 5>;

    let c : f32 = 0.0001;
    const rho : f32 = 0.65;
	var alpha : f32 = pow(rho, f32(4*local_invocation_id.x));
	

    t_i[local_invocation_id.y][0] = tlist[tlist_index];
    t_i[local_invocation_id.y][1] = tlist[tlist_index + 1];
    t_i[local_invocation_id.y][2] = tlist[tlist_index + 2];
    t_i[local_invocation_id.y][3] = tlist[tlist_index + 3];
    t_i[local_invocation_id.y][4] = tlist[tlist_index + 4];


    var iter : i32;

    output[tlist_index] = 1.0;


    for(iter = 0; iter< MAX_ITER; iter++){

        set_variables(local_invocation_id.x, local_invocation_id.y);

        if(abort[local_invocation_id.y] == true){
            return;
        }



        grad_compute(local_invocation_id.x, local_invocation_id.y);
        hess_compute(local_invocation_id.x, local_invocation_id.y);

        
        grad_length = sqrt(
            pow(grad[local_invocation_id.y][0], 2.0) 
            + pow(grad[local_invocation_id.y][1], 2.0)
            + pow(grad[local_invocation_id.y][2], 2.0)
            + pow(grad[local_invocation_id.y][3], 2.0)
        );


        if((grad_length < grad_stop_double) || (ptol[local_invocation_id.y] <= ptol_stop_double)){
            if(ptol[local_invocation_id.y] > ptol_stop_double){
                return;
            }


            if(check_order(t_i[local_invocation_id.y])){

                if(check_pentagon(t_i[local_invocation_id.y])){

                    if(local_invocation_id.x == 0){
                        output[tlist_index] = t_i[local_invocation_id.y][0];
                        output[tlist_index + 1] = t_i[local_invocation_id.y][1];
                        output[tlist_index + 2] = t_i[local_invocation_id.y][2];
                        output[tlist_index + 3] = t_i[local_invocation_id.y][3];
                        output[tlist_index + 4] = t_i[local_invocation_id.y][4];
                    }
                }
                return;
            }

            var tmp : f32 = t_i[local_invocation_id.y][1];

            t_i[local_invocation_id.y][1] = t_i[local_invocation_id.y][4];
            t_i[local_invocation_id.y][4] = tmp;
            tmp = t_i[local_invocation_id.y][2];
            t_i[local_invocation_id.y][2] = t_i[local_invocation_id.y][3];
            t_i[local_invocation_id.y][3] = tmp;

            if(check_order(t_i[local_invocation_id.y])){

                if(check_pentagon(t_i[local_invocation_id.y])){

                    if(local_invocation_id.x == 0){
                        output[tlist_index] = t_i[local_invocation_id.y][0];
                        output[tlist_index + 1] = t_i[local_invocation_id.y][1];
                        output[tlist_index + 2] = t_i[local_invocation_id.y][2];
                        output[tlist_index + 3] = t_i[local_invocation_id.y][3];
                        output[tlist_index + 4] = t_i[local_invocation_id.y][4];
                    }
            
                }
            }

            return;

        }



        modified_Cholesky(local_invocation_id.y);


        grad_dot_diff = (
            grad[local_invocation_id.y][0] * diff[local_invocation_id.y][0]
            + grad[local_invocation_id.y][1] * diff[local_invocation_id.y][1]
            + grad[local_invocation_id.y][2] * diff[local_invocation_id.y][2]
            + grad[local_invocation_id.y][3] * diff[local_invocation_id.y][3]
        );


        for (i = 0; i < 4; i++)
        {

            x_n[0] = t_i[local_invocation_id.y][0];
            x_n[1] = t_i[local_invocation_id.y][1] - alpha*diff[local_invocation_id.y][0];
            x_n[2] = t_i[local_invocation_id.y][2] - alpha*diff[local_invocation_id.y][1];
            x_n[3] = t_i[local_invocation_id.y][3] - alpha*diff[local_invocation_id.y][2];
            x_n[4] = t_i[local_invocation_id.y][4] - alpha*diff[local_invocation_id.y][3];

            func = (
                length(knotc(x_n[0]) - knotc(x_n[3])) * length(knotc(x_n[1]) - knotc(x_n[2]))
                + length(knotc(x_n[1]) - knotc(x_n[3])) * length(knotc(x_n[0]) - knotc(x_n[2]))
                - length(knotc(x_n[0]) - knotc(x_n[1])) * length(knotc(x_n[2]) - knotc(x_n[3]))
                
                + length(knotc(x_n[0]) - knotc(x_n[3])) * length(knotc(x_n[2]) - knotc(x_n[4]))
                + length(knotc(x_n[0]) - knotc(x_n[2])) * length(knotc(x_n[3]) - knotc(x_n[4]))
                - length(knotc(x_n[0]) - knotc(x_n[4])) * length(knotc(x_n[2]) - knotc(x_n[3]))
            );

            if(func <= (ptol[local_invocation_id.y] - c*alpha*grad_dot_diff)){
                backtrack[local_invocation_id.y][4*local_invocation_id.x + i] = 4*local_invocation_id.x + i;
            } else {
                backtrack[local_invocation_id.y][4*local_invocation_id.x + i] = 15;
            }

            alpha = alpha * rho;

        }



        min_backtrack = 15;

        if(local_invocation_id.x == 0){

            for (i = 0; i < 16; i++)
            {
                if(backtrack[local_invocation_id.y][i] < min_backtrack){
                    min_backtrack = backtrack[local_invocation_id.y][i];
                }
            }

            alpha = pow(rho, f32(min_backtrack));

            t_i[local_invocation_id.y][1] = t_i[local_invocation_id.y][1] - alpha*diff[local_invocation_id.y][0];
            t_i[local_invocation_id.y][2] = t_i[local_invocation_id.y][2] - alpha*diff[local_invocation_id.y][1];
            t_i[local_invocation_id.y][3] = t_i[local_invocation_id.y][3] - alpha*diff[local_invocation_id.y][2];
            t_i[local_invocation_id.y][4] = t_i[local_invocation_id.y][4] - alpha*diff[local_invocation_id.y][3];
        }
        

        t_i[local_invocation_id.y][local_invocation_id.x + 1] = fract(t_i[local_invocation_id.y][local_invocation_id.x + 1]);

        proxim(local_invocation_id.x, local_invocation_id.y, error_field);

        if(abort[local_invocation_id.y] == true){
            return;
        }

        iter ++;

    }


}

fn check_order(t_i : array<f32, 5>) -> bool{
    if(
        (t_i[0] < t_i[1])
        && (t_i[1] < t_i[2])
        && (t_i[2] < t_i[3])
        && (t_i[3] < t_i[4])
    ){
        return true;
    }else if(
        (t_i[4] < t_i[0])
        && (t_i[0] < t_i[1])
        && (t_i[1] < t_i[2])
        && (t_i[2] < t_i[3])
    ){
        return true;
    }else if(
        (t_i[3] < t_i[4])
        && (t_i[4] < t_i[0])
        && (t_i[0] < t_i[1])
        && (t_i[1] < t_i[2])
    ){
        return true;
    }else if(
        (t_i[2] < t_i[3])
        && (t_i[3] < t_i[4])
        && (t_i[4] < t_i[0])
        && (t_i[0] < t_i[1])
    ){
        return true;
    }else if(
        (t_i[1] < t_i[2])
        && (t_i[2] < t_i[3])
        && (t_i[3] < t_i[4])
        && (t_i[4] < t_i[0])
    ){
        return true;
    }

    return false;
}

fn proxim(x : u32, y : u32, proxim_float : f32){
    for(var i = i32(x) + 1; i < 5; i++){
        let t_diff = t_i[y][i] - t_i[y][x];

        if((abs(t_diff) < proxim_float)
            || (abs(t_diff + 1.0) < proxim_float)
            || (abs(1.0 - t_diff) < proxim_float))
        {
            abort[y] = true;
            return;
        }
    }
}


fn modified_Cholesky(z: u32) {

    var max_diag : f32 = 0.0;
    var max_nondiag : f32 = 0.0;


    for (var i = 0; i < 4; i++)
    {
        if(abs(hess[z][i*4+i]) > max_diag){
            max_diag = abs(hess[z][i*4+i]);
        }
        for(var j =i+1; j < 4; j++){
            if(abs(hess[z][i*4+j]) > max_nondiag){
                max_nondiag = abs(hess[z][i*4+j]);
            }
        }
    }

    var beta2 : f32 = max(max(max_diag, max_nondiag/(sqrt(f32(15)))), 0.0001);

    var temp : array<f32, 16>;
    var D : array<f32, 4>;
    var L : array<f32, 16>;

    var theta : array<f32, 4>;

    for(var j =0; j<4; j++){
        temp[j*4 + j] = hess[z][j*4 + j];
        for(var s = 0; s< j; s++){
            temp[j*4 + j] -= D[s]*L[j*4 + s]*L[j*4 + s];
        }
        
        for(var i=j+1; i<4; i++){
            temp[i*4 + j] = hess[z][i*4 + j];
            for(var s = 0; s< j; s++){
                temp[i*4 + j] -= D[s]*L[i*4 + s]*L[j*4 + s];
            }

            if(theta[j]< abs(temp[i*4 + j])){
                theta[j]= abs(temp[i*4 + j]);
            }
        }

        D[j] = max(max(abs(temp[j*4 + j]), theta[j]*theta[j]/beta2), 0.001);
        
        for(var i=j+1; i<4; i++){
            L[i*4 + j] = temp[i*4 + j]/D[j];
        }
        L[j*4 + j] = 1.0;
    }

    // forward substitution.
    var y : array<f32, 4>;
    var sum : f32;

    for (var i = 0; i < 4; i++)
    {
        sum = grad[z][i];
        for (var j = 0; j < i; j++){
            sum -= L[i*4+j] * y[j];
        }
        y[i] = sum / L[i*4 +i];
    }


    // back substitution.
    // var retval = new Array(4);

    for (var k = 3; k >= 0; k--)
    {
        sum = y[k];
        for (var j = k + 1; j < 4; j++){
            sum -= L[j*4+k] * diff[z][j] * D[k];
        }
        diff[z][k] = sum/(D[k]);
    }

}


fn check_pentagon(t_i : array<f32, 5>) -> bool {

    let v1 = knotc(t_i[0]);
    let v2 = knotc(t_i[3]);
    let v3 = knotc(t_i[1]);
    let v4 = knotc(t_i[4]);
    let v5 = knotc(t_i[2]);

    let v12 = (v2-v1);
    let v23 = (v3-v2);
    let v34 = (v4-v3);
    let v45 = (v5-v4);
    let v51 = (v1-v5);

    var sum_angle : f32 = 0.0;

    sum_angle += acos(-1*dot(v12,v23)/(length(v12)*length(v23)));
    sum_angle += acos(-1*dot(v23,v34)/(length(v23)*length(v34)));
    sum_angle += acos(-1*dot(v34,v45)/(length(v34)*length(v45)));
    sum_angle += acos(-1*dot(v45,v51)/(length(v45)*length(v51)));
    sum_angle += acos(-1*dot(v51,v12)/(length(v51)*length(v12)));

    if(abs(sum_angle - 3*PI) < 0.02){
        return true;
    }
    return false;


}



fn knotc(param : f32) -> vec3f {
    let t : f32 = 2 * PI * param;
    let ret : vec3f = (
        knot_info.cos[0] * cos(t) + knot_info.cos[1] * cos(2*t) + knot_info.cos[2] * cos(3*t) + knot_info.cos[3] * cos(4*t) + knot_info.cos[4] * cos(5*t) + knot_info.cos[5] * cos(6*t)
        + knot_info.sin[0] * sin(t) + knot_info.sin[1] * sin(2*t) + knot_info.sin[2] * sin(3*t) + knot_info.sin[3] * sin(4*t) + knot_info.sin[4] * sin(5*t)+ knot_info.sin[5] * sin(6*t)
    );
	return ret;
}
fn knotd(param : f32) -> vec3f {
    let t : f32 = 2 * PI * param;
    let ret : vec3f = (
        knot_info.sin[0] * cos(t) + knot_info.sin[1] *2* cos(2*t) + knot_info.sin[2] *3* cos(3*t) + knot_info.sin[3] *4* cos(4*t) + knot_info.sin[4] *5* cos(5*t)+ knot_info.sin[5] *6* cos(6*t)
        - knot_info.cos[0] * sin(t) - knot_info.cos[1] *2* sin(2*t) - knot_info.cos[2] *3* sin(3*t) - knot_info.cos[3] *4* sin(4*t) - knot_info.cos[4] *5* sin(5*t)- knot_info.cos[5] *6* sin(6*t)
    );
	return 2*PI*ret;
}
fn knotd2(param : f32) -> vec3f {
    let t : f32 = 2 * PI * param;
    let ret : vec3f = (
        knot_info.cos[0] * cos(t) + knot_info.cos[1] *4* cos(2*t) + knot_info.cos[2] *9* cos(3*t) + knot_info.cos[3] *16* cos(4*t) + knot_info.cos[4] *25* cos(5*t)+ knot_info.cos[5] *36* cos(6*t)
        + knot_info.sin[0] * sin(t) + knot_info.sin[1] *4* sin(2*t) + knot_info.sin[2] *9* sin(3*t) + knot_info.sin[3] *16* sin(4*t) + knot_info.sin[4] *25* sin(5*t)+ knot_info.sin[5] *36* sin(6*t)
    );
	return -4*PI*PI*ret;
}

