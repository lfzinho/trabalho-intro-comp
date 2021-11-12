var canvas = document.querySelector('canvas');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight*.96;

var c = canvas.getContext('2d');

// =====================================
// >>> Funções úteis pros objetos
function color_writer(arr) {
    return 'rgba('+String(arr[0])+','+String(arr[1])+','+String(arr[2])+','+String(arr[3])+')'
}

function choose(arr){
    return arr[Math.floor(Math.random()*arr.length)];
}

function isOutScreen (obj) {
    if (obj.pos[1] > window.innerHeight+obj.size*2) {
        return true
    }
}

// detecta os pontos englobados pelo arco do ponto central
/**
 * Gambiarra Alert: Essa parte é muito menos intuitiva que o resto!
 * 
 * Essa é a função que detecta se um ponto foi englobado pelo arco do ponto central.
 * A ideia original era fazer essa função dentro do update() do arco, mas aparentemente
 * não dá pra rodar for loops enquanto a função process() atualiza os frames. Logo, eu
 * precisei tornar tudo global e isso acabou sendo meio verboso.
 * Se tu tiver ficado interessado no código, ignora essa função aqui e lê o resto, que
 * tá bem mais bonitinho :D
 */
var global_ang = 0;
var global_point_list = [];
function update_points (list) {
    for (i in list){

        if (list[i].angle <= global_ang && list[i].marked == false) {
            list[i].marked = true;
            var point_idx = parseInt(list[i].id)+1;

            // recolore  o ponto
            m_obj[point_idx].c = [52, 201, 92, 1];

            // Cria as linhas que ligam os pontos

            // ignora o primeiro ponto
            if (i == 0){}

            //liga o ponto anterior a ele
            else{ 
                var point_before_idx = parseInt(list[parseInt(i-1)].id)+1;

                m_obj.push( new line(m_obj[point_before_idx].pos, m_obj[point_idx].pos))
            }

            //liga o último ponto ao primeiro ponto
            if ( i == list.length-1) {
                var first_point_idx = parseInt(list[0].id)+1;
                m_obj.push( new line(m_obj[point_idx].pos, m_obj[first_point_idx].pos))
            }
        }
    }
}


// =====================================
// >>> Objetos matemáticos
m_obj = [];

// tipo ponto
function point (pos, type = "point", color = [255, 255, 255, .3], size = 5) {
    this.type = type;
    this.pos = pos;
    this.c = color;
    this.size = size;

    this.update = function() {
    }

    this.draw = function() {
        c.fillStyle = color_writer(this.c);
        c.beginPath();
        c.arc(pos[0], pos[1], size, 0, Math.PI*2, false);
        c.fill();
    }
}

// tipo linha
function line (begin_pos, end_pos, color = [255, 255, 255, .3], size = 5, instant=false) {
    this.type = "line";
    this.bpos = begin_pos;
    this.epos = end_pos;
    this.aepos = [...this.bpos]; //actual end position; é diferente do epos se a reta não for instantânea
    this.c = color;
    this.size = size;
    this.instant = instant;

    this.update = function() {
        // linha que cresce gradualmente
        if (!this.instant) {
            this.aepos[0] = this.aepos[0]+ (this.epos[0] - this.aepos[0])*0.2;
            this.aepos[1] = this.aepos[1]+ (this.epos[1] - this.aepos[1])*0.2;
        }
        else {
            this.aepos = this.epos;
        }

    }

    this.draw = function() {
        c.save();
        c.translate(this.bpos[0], this.bpos[1] + this.size/2);

        // calcula o angulo da reta
        var angle = Math.atan((begin_pos[1]-end_pos[1])/(begin_pos[0]-end_pos[0]));
        if (begin_pos[0] > end_pos[0]){
            angle += Math.PI;
        }

        c.rotate(angle);
        c.fillStyle = color_writer(this.c);
        var length = Math.sqrt(Math.pow(this.bpos[0]-this.aepos[0], 2) + Math.pow(this.bpos[1] - this.aepos[1], 2));
        c.fillRect(0, 0, length, this.size);
        c.restore();
    }
}

// tipo arco
function arc (pos, color = [128, 128, 255, .2], size=2000) {
    this.type = "arc";
    this.pos = pos;
    this.c = color;
    this.size = size;
    this.angle = 0;
    this.step = 0.005*Math.PI;
    

    this.update = function() {
        if (this.angle <= Math.PI*2) {
            this.angle += this.step;
            global_ang = this.angle;
        }
        else {
            this.c[3] *= 0.9;
        }
    }

    this.draw = function() {
        c.fillStyle = color_writer(this.c);
        c.beginPath();

        // faz o círculo crescer gradualmente

        if (this.angle < Math.PI*2) {
        c.moveTo(this.pos[0], this.pos[1]);
        c.lineTo(this.pos[0]+this.size, this.pos[1]);
        c.arc(this.pos[0], this.pos[1], this.size, 0, (Math.PI*2-this.angle), true);
        }
        else {
        c.arc(this.pos[0], this.pos[1], this.size, 0, Math.PI*2, true);
        }

        c.closePath();
        c.fill();
    }
}


// =====================================
// >>> Objetos físicos
p_obj = [];

// tipo partícula
function particle (pos, size, color, dir = [0,0], speed = 1, decay = 0.9) {
    this.type = "particle";
    this.pos = pos;
    this.size = size;
    this.dir = dir;
    this.speed = speed;
    this.atr = 1 - 0.05; //atrito
    this.decay = decay;
    this.c = [...color]; //cor em rgba; resumido pq usa bastante

    this.physics = function(grav) {
        this.speed *= this.atr;
        this.pos[0] += this.dir[0] * this.speed;
        this.pos[1] += this.dir[1] * this.speed;
        this.size *= this.decay;
        this.size += (Math.random()-0.5)*2;

        // verifica se a partícula tá pequena o suficiente pra se deletar
        if (this.size <= 1) {
            pos[1] += Infinity;
        }
    }

    this.draw = function() {
        c.fillStyle = color_writer(this.c);
        c.fillRect(this.pos[0], this.pos[1], this.size, this.size);
    }
}

// tipo bola de foguete
function firework (pos, size, dir, color, speed=20, time=100, part=0.7) {
    this.type = "firework";
    this.pos = pos;
    this.size = size;
    this.dir = dir;
    this.speed = speed;
    this.atr = 1 - 0.01;
    this.time = time;
    this.exploded = false;
    this.part = part;
    this.c = color; //cor em rgba; resumido pq usa bastante
    this.start_color = this.c.slice();

    this.physics = function(grav) {
        this.speed *= this.atr;
        this.pos[0] += this.dir[0] * this.speed;
        this.pos[1] += this.dir[1] * this.speed - grav;
        this.time --;

        //spawna partículas aleatoriamente
        if (Math.random() >= this.part && !this.exploded) {
            var part_x = this.pos[0] + (Math.random()*10)-5;
            var part_y = this.pos[1] + (Math.random()*10)-5;
            this.c[0] += (255-this.c[0])*0.2;
            this.c[1] += (255-this.c[1])*0.2;
            this.c[2] += (255-this.c[2])*0.2;

            p_obj.push( new particle([part_x, part_y], 10, this.c, [0, 0], this.speed/2, 0.95));
        }

        //estoura
        if (this.time <= 0 && !this.exploded){
            this.c[3] = 0;
            this.exploded = true;

            m_obj.push( new point([...this.pos]));

            for (let i = 0; i < Math.random()*10+30; i++) {
                var part_x = this.pos[0] + (Math.random()*10)-5;
                var part_y = this.pos[1] + (Math.random()*10)-5;
                var ang = Math.random()*Math.PI*2;

                p_obj.push( new particle([part_x, part_y], 25, this.start_color, [Math.cos(ang), Math.sin(ang)], Math.random()*3+7, 0.95));
            }
        }
    }

    this.draw = function() {
        c.fillStyle = color_writer(this.c);
        c.beginPath();
        c.arc(pos[0], pos[1], size, 0, Math.PI*2, false);
        c.fill();
        c.restore();
    }
}


// =====================================
// >>> Interações do usuário

// clique
canvas.addEventListener('click', function() { 
        var dir_b = Math.random();
        var r_color = choose([[66, 135, 245, 1], [170, 49, 235, 1], [56, 235, 71, 1], [247, 65, 45, 1], [245, 54, 124, 1]]);

        var r_speed = Math.random()*5 + 13;

        p_obj.push( new firework(pos=[0, 600], size=12, dir=[(1-dir_b), -(1+dir_b/2)], color= [...r_color], speed=r_speed));

}, false);

// Fullscreen
function openFullscreen() {
    var elem = document.getElementById("tutorial");
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }
    canvas.height = window.outerHeight;
}

// Esconde/mostra elementos matemáticos
var show_math = false;
function toggle_math() {
    show_math = !show_math;
    if (show_math){
        document.getElementById("tg_btn").innerText = 'Hide math';
    }
    else {
        document.getElementById("tg_btn").innerText = 'Show math';
    }
}

// Deleta todos os objetos matemáticos
function clear_math() {
    m_obj = []
}

// botão polígono
function get_polygon() {
    var coords_mid = [0, 0];
    var n_of_points = 0;
    var point_list = [];

    var to_be_deleted = [];
    for (i in m_obj){
        // seleciona os elementos pra deletar
        if (m_obj[i].type == "mid_point" || m_obj[i].type == "arc" || m_obj[i].type == "line"){
            to_be_deleted.unshift(i);
        }

        // cria o ponto central
        if (m_obj[i].type == "point"){
            m_obj[i].c = [255, 255, 255, .3];

            coords_mid[0] += m_obj[i].pos[0];
            coords_mid[1] += m_obj[i].pos[1];
            n_of_points ++;
        }
    }
    
    coords_mid[0] /= n_of_points;
    coords_mid[1] /= n_of_points;

    // deleta os itens selecionados
    for (i in to_be_deleted){
        m_obj.splice(to_be_deleted[i], 1);
    }

    // cria um dicionário de angulos entre todos os pontos e o ponto central
    for (i in m_obj){
        if (m_obj[i].type == "point"){
            var act_p = m_obj[i];

            
            var angle = Math.atan2((coords_mid[1]-act_p.pos[1]), (act_p.pos[0]-coords_mid[0]));
            if (angle < 0) { angle += Math.PI*2}

            point_list.push( {"angle": angle,
                            "id": i,
                            "marked": false} )
        }
    }
    point_list.sort( function calc(a, b) {
        return a.angle - b.angle
    })
    global_point_list = point_list;
    console.log(point_list);

    m_obj.push( new point(coords_mid, "mid_point", [255, 255, 255, 1], 10));
    m_obj.unshift( new arc([...coords_mid]));
}


// =====================================
// >>> Loop que processa todas as coisas
var frame = 0;
function process() {
    c.fillStyle = "#131313";
    c.fillRect(0, 0, window.innerWidth, window.innerWidth);
    c.save();

    // loop que roda pra todo objeto físico
    for (i in p_obj) {
        p_obj[i].physics(grav = -10);
        p_obj[i].draw();

        // verifica se o objeto saiu da tela e remove ele (n verifica o tempo todo pq remover objetos trava um pouco)
        if (frame%300 == 0){
            if ( isOutScreen(p_obj[i]) ) {
                p_obj.splice(i, 1);
            }
        }
    }

    // loop que roda pra todo objeto matemático
    if (show_math){
        for (i in m_obj){
            m_obj[i].update();
            m_obj[i].draw();

            update_points(global_point_list);
        }
    }

    frame++
    requestAnimationFrame(process);
}

process()