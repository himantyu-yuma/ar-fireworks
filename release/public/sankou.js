var voiceFireFlower = voiceFireFlower || {};

(function () {

    let fireStage;
    let containerTag;
    let voiceController;

    const init = function () {
        containerTag = document.createElement('div');
        document.body.appendChild(containerTag);

        fireStage = new voiceFireFlower.FireStage();
        fireStage.init(containerTag);

        setUserAction();

    };

    const startVoiceControll = function () {
        if (!voiceController) {
            voiceController = new voiceFireFlower.VoiceController();
        }
        document.getElementById("intro").style.display = "block";
    };

    const setUserAction = function () {

        document.addEventListener("ctrlcamera_side", function (e) {
            fireStage.rotateCamera("side");
        });

        document.addEventListener("ctrlcamera_under", function (e) {
            fireStage.rotateCamera("under");
        });

        document.addEventListener("voiceShoot", function (e) {
            fireStage.shootFire(false);
        });

        document.addEventListener("voiceExplosion", function (e) {
            fireStage.explosion();
        });


        let isTouchSupported = true;
        document.addEventListener("mousedown", function (e) {
            isTouchSupported = false;
            fireStage.shootFire(true);
        });

        if (isTouchSupported) {
            document.addEventListener("touchstart", function (e) {
                fireStage.shootFire(true);
            });
        }

        containerTag.addEventListener('touchstart', function (e) {
            e.preventDefault();
        }, { passive: false });
    };


    window.onload = init;

})();
var voiceFireFlower = voiceFireFlower || {};

(function () {

    function FireStage() {

        let container;
        let scene;
        let camera;
        let renderer;
        let composer;
        let stats;
        let fireflowers = [];
        let cameraControl;

        const init = function (targetTag) {

            const loader = new THREE.TextureLoader();
            loader.load('images/particle.png', function (texture) {
                voiceFireFlower.assets.particleTexture = texture;
                setUpStage(targetTag);
                render();
            });

            const objLoader = new THREE.GLTFLoader();
            objLoader.load('images/panjan2_join.glb', function (model) {
                voiceFireFlower.assets.catModel = model;
            });

        };

        const setUpStage = function (targetTag) {

            scene = new THREE.Scene();
            // scene.fog = new THREE.FogExp2( 0x000000, 0.0107 );

            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
            camera.position.set(140, 20, 140);
            camera.lookAt(scene.position);

            // cameraControl = new THREE.OrbitControls(camera, true);
            // cameraControl.zoomSpeed = 0.5;

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            // renderer.setPixelRatio(window.devicePixelRatio);

            container = new THREE.Group();
            scene.add(container);

            const renderScene = new THREE.RenderPass(scene, camera);

            const effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
            effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
            const copyShader = new THREE.ShaderPass(THREE.CopyShader);
            copyShader.renderToScreen = true;

            // resolution, strength, radius, threshold 
            const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1, 0.1, 0.2);// 1.5, 0.4, 0.85

            composer = new THREE.EffectComposer(renderer);
            composer.setSize(window.innerWidth, window.innerHeight);
            composer.addPass(renderScene);
            composer.addPass(effectFXAA);
            composer.addPass(bloomPass);
            composer.addPass(copyShader);
            renderer.gammaInput = true;
            renderer.gammaOutput = true;

            targetTag.appendChild(renderer.domElement);

            const floor = new THREE.GridHelper(160, 20);
            floor.position.y = -30;
            container.add(floor);

            stats = new Stats();
            stats.dom.style.right = 0;
            stats.dom.style.left = null;
            targetTag.appendChild(stats.dom);
        };

        const shootFire = function (isAutoExplosion) {
            let fireflower = new voiceFireFlower.FireFlower(isAutoExplosion);
            container.add(fireflower);
            fireflowers.push(fireflower);
        };

        const explosion = function () {
            for (let i = 0; i <= fireflowers.length; i++) {
                if (fireflowers[i] && fireflowers[i].isShooting) {
                    fireflowers[i].explosion();
                    // break;
                }
            }
        };

        const render = function () {
            container.rotation.y += 0.0005;
            for (let i = fireflowers.length - 1; i >= 0; i--) {
                fireflowers[i].update();
                if (fireflowers[i].getLife() <= 0) {
                    container.remove(fireflowers[i]);
                    fireflowers.splice(i, 1);
                }
            }

            cameraControl.update();
            // renderer.render(scene, camera);
            composer.render();
            requestAnimationFrame(render);
            stats.update();
        };

        const rotateCamera = function (target) {
            const duration = 0.8;
            let cameraDistance = Math.sqrt(Math.pow(camera.position.x, 2) + Math.pow(camera.position.y, 2) + Math.pow(camera.position.z, 2));
            let targetY;
            let targetX;
            let targetZ;
            if (target == "side") {
                targetX = Math.random() * cameraDistance;
                targetY = 0;
                targetZ = Math.sqrt(Math.pow(cameraDistance, 2) - Math.pow(targetX, 2));
            } else if (target == "under") {
                targetX = 80;
                targetZ = 80;
                targetY = -Math.sqrt(Math.pow(cameraDistance, 2) - Math.pow(targetX, 2) - Math.pow(targetZ, 2));
            }
            TweenLite.to(camera.position, duration, {
                x: targetX,
                y: targetY,
                z: targetZ,
                ease: Cubic.easeOut
            });
        };

        const getRenderTag = function () {
            return renderer.domElement;
        };

        return {
            init: init,
            shootFire: shootFire,
            explosion: explosion,
            getRenderTag: getRenderTag,
            rotateCamera: rotateCamera
        };
    }


    voiceFireFlower.FireStage = FireStage;


})();
var voiceFireFlower = voiceFireFlower || {};
voiceFireFlower.assets = {};
var util = util || {};

(function () {


    // ============================================
    // UserController Class
    // ============================================

    function UserController() {

        var minRotateAccelY = 0.01;
        var rotateAccelX = 0;
        var rotateAccelY = minRotateAccelY;
        var isTouch = false;
        var touchPoints = [];
        var container;

        var start = function () {
            setUserAction();
        };

        var stop = function () {
            removeUserAction();
        };

        var setUserAction = function () {
            document.addEventListener("mousedown", onClickStart);
            document.addEventListener("mousemove", onClickMove);
            window.addEventListener("mouseup", onClickEnd);
            document.addEventListener("wheel", onWheel);
            document.addEventListener("touchstart", onTouchStart);
            document.addEventListener("touchmove", onTouchMove);
            document.addEventListener("touchend", onTouchEnd);
        };

        var removeUserAction = function () {
            document.removeEventListener("mousedown", onClickStart);
            document.removeEventListener("mousemove", onClickMove);
            window.removeEventListener("mouseup", onClickEnd);
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
        };


        var onClickStart = function (e) {
            e.preventDefault();
            isTouch = true;
            touchPoints = [{ x: e.clientX, y: e.clientY }];
        };

        var onClickMove = function (e) {
            if (isTouch) {
                e.preventDefault();
                var nowTouchPoints = [{ x: e.clientX, y: e.clientY }];
                // var targetRotationX=modelContainer.rotation.x+(nowTouchPoints[0].y-touchPoints[0].y)*0.004;
                // modelContainer.rotation.x=targetRotationX;
                // if(Math.abs(targetRotationX)<0.4){
                // 	
                // }
                rotateAccelY = (nowTouchPoints[0].x - touchPoints[0].x) * 0.004;
                container.rotation.y += rotateAccelY;
                touchPoints = [{ x: e.clientX, y: e.clientY }];
            }
        };

        var onClickEnd = function (e) {
            isTouch = false;
        };

        var onWheel = function (e) {
            e.preventDefault();
            var moveValue = 0.06;
            if (e.deltaY > 2) {
                var targetCameraPosition = camera.position.z - moveValue;
                if (targetCameraPosition < 2) { targetCameraPosition = 2; }
                camera.position.z = targetCameraPosition;
            } else if (e.deltaY < -2) {
                var targetCameraPosition = camera.position.z + moveValue;
                if (targetCameraPosition > 50) { targetCameraPosition = 50; }
                camera.position.z = targetCameraPosition;
            }
        };


        var onTouchStart = function (e) {
            e.preventDefault();
            isTouch = true;
            touchPoints = getTouchPoint(e.touches);
        };
        var onTouchMove = function (e) {
            e.preventDefault();


            var nowTouchPoints = getTouchPoint(e.touches);

            //回転
            if (nowTouchPoints.length == 1) {
                // var targetRotationX=modelContainer.rotation.x+(nowTouchPoints[0].y-touchPoints[0].y)*0.01;
                // if(Math.abs(targetRotationX)<0.4){
                // 	modelContainer.rotation.x=targetRotationX;
                // }

                rotateAccelY = (nowTouchPoints[0].x - touchPoints[0].x) * 0.01;
                container.rotation.y += rotateAccelY;
            }
            //拡大
            else if (nowTouchPoints.length == 2) {
                var nowDistance = getDistance(nowTouchPoints[0], nowTouchPoints[1]);
                var beforeDistance = getDistance(touchPoints[0], touchPoints[1]);
                var targetCameraPosition = camera.position.z + (beforeDistance - nowDistance) * 0.01;
                if (targetCameraPosition < 3) { targetCameraPosition = 3; }
                else if (targetCameraPosition > 7) { targetCameraPosition = 7; }
                camera.position.z = targetCameraPosition;
            }

            touchPoints = getTouchPoint(e.touches);
        };
        var onTouchEnd = function (e) {
            touchPoints = getTouchPoint(e.touches);
            if (touchPoints.length == 0) {
                isTouch = false;
            }
        };

        var getTouchPoint = function (touches) {
            var points = [];
            for (var i = 0, num = touches.length; i < num; i++) {
                points[i] = { x: touches[i].clientX, y: touches[i].clientY };
            }
            return points;
        };

        var getDistance = function (p1, p2) {
            return Math.sqrt(Math.pow((p1.x - p2.x), 2) + Math.pow((p1.y - p2.y), 2));
        };

        var update = function () {
            if (!isTouch) {
                if (Math.abs(rotateAccelY) > minRotateAccelY) {
                    rotateAccelY *= 0.9;
                } else {
                    if (rotateAccelY < 0) {
                        rotateAccelY = -minRotateAccelY;
                    } else {
                        rotateAccelY = minRotateAccelY;
                    }
                }
                container.rotation.y += rotateAccelY;
            }
        };

        return {
            start: start,
            stop: stop,
            update: update
        };
    };


    util.UserController = UserController;

})();

var util = util || {};


util.getRandomColor = function () {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}
util.isPC = function () {
    let chk = true;
    let ua = navigator.userAgent;
    if (ua.indexOf('iPhone') > 0 || ua.indexOf('iPod') > 0 || ua.indexOf('Android') > 0 || ua.indexOf('iPad') > 0) {
        chk = false;
    }
    return chk;
};
var voiceFireFlower = voiceFireFlower || {};

(function () {

    // VoiceController Class
    function VoiceController() {
        Object.call(this);

        let self = this;

        this.nowShootWaitCnt = 0;
        this.nowExplosionWaitCnt = 0;
        this.nowCameraCtrlWaitCnt = 0;
        this.maxWaitCnt = 80;

        if (window.webkitSpeechRecognition != null && window.webkitSpeechRecognition) {

            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'ja-JP';
            this.recognition.onresult = function (e) {
                self.detect(self, e.results);
            };
            this.recognition.onerror = function (e) {
                console.log(e);
            };

            this.recognition.start();

            setInterval(function () {
                if (self.nowShootWaitCnt > 0) {
                    self.nowShootWaitCnt--;
                }
                if (self.nowExplosionWaitCnt > 0) {
                    self.nowExplosionWaitCnt--;
                }
                if (self.nowCameraCtrlWaitCnt > 0) {
                    self.nowCameraCtrlWaitCnt--;
                }
            }, 1000 / 30);

        }

        // var canvas = document.createElement("canvas");
        // canvas.style.position="fixed";
        // canvas.style.top=0;
        // canvas.style.left=0;
        // canvas.width=400;
        // canvas.height=400;
        // canvas.style.backgroundColor="#fff";

        // document.body.appendChild(canvas);
        // this.ctx=canvas.getContext("2d");

        // navigator.getUserMedia({
        // 	audio: true, 
        // 	video: false
        // },
        // function(stream){
        // 	self.startStream(self,stream)
        // },
        // function(e) { // error
        // 	console.error("Error on start video: " + e.code);
        // });

    }
    VoiceController.prototype = Object.assign(Object.create(Object.prototype), {

        detect: function (self, resultData) {
            console.log(resultData);
            for (let i = 0; i < resultData.length; i++) {
                for (let j = 0; j < resultData.length; j++) {
                    let data = resultData[i][j];
                    if (data && !resultData[i].isFinal) {
                        console.log(data.transcript + " : " + data.confidence + " , " + self.nowShootWaitCnt);

                        if (self.nowShootWaitCnt == 0 && self.checkShootWord(data.transcript)) {
                            let event = new Event('voiceShoot');
                            document.dispatchEvent(event);
                            self.nowShootWaitCnt = self.maxWaitCnt;
                            break;

                        } else if (self.nowExplosionWaitCnt == 0 && self.checkExplosionWord(data.transcript)) {
                            let event = new Event('voiceExplosion');
                            document.dispatchEvent(event);
                            self.nowExplosionWaitCnt = self.maxWaitCnt;
                            break;

                        } else if (self.nowCameraCtrlWaitCnt == 0 && self.checkSideWord(data.transcript)) {
                            let event = new Event('ctrlcamera_side');
                            document.dispatchEvent(event);
                            self.nowCameraCtrlWaitCnt = self.maxWaitCnt;
                            break;

                        } else if (self.nowCameraCtrlWaitCnt == 0 && self.checkUnderWord(data.transcript)) {
                            let event = new Event('ctrlcamera_under');
                            document.dispatchEvent(event);
                            self.nowCameraCtrlWaitCnt = self.maxWaitCnt;
                            break;

                        }
                    }
                }
            }
        },


        checkWord: function (str, words) {
            let chk = false;

            for (let i = 0; i < words.length; i++) {
                if (str.indexOf(words[i]) >= 0) {
                    chk = true;
                    break;
                }
            }
            return chk;

        },
        checkUnderWord: function (str) {
            let words = ["下から", "下", "したから"];
            return this.checkWord(str, words);
        },
        checkSideWord: function (str) {
            let words = ["横から", "横", "よこから"];
            return this.checkWord(str, words);
        },
        checkShootWord: function (str) {
            let words = ["旬", "今日", "キュン", "ユー", "ヒュン", "チュン", "チューン", "ヒュー", "9", "球", "cune", "皮膚", "うちあげ", "打ち上げ", "打上"];
            return this.checkWord(str, words);
        },

        checkExplosionWord: function (str) {
            let words = ["バン", "バー", "バーン", "ダン", "ドー", "ドン", "丼", "タン", "トン", "豚", "版", "と", "ばん", "どん", "ばくは", "爆破", "爆発"];
            return this.checkWord(str, words);
        },

        startStream: function (self, stream) {
            let audioContext = new AudioContext();
            let src = audioContext.createMediaStreamSource(stream);
            let analyser = audioContext.createAnalyser(stream);
            let frequency;
            let bufferLength;

            analyser.fftSize = 2048;
            bufferLength = analyser.frequencyBinCount;
            frequency = new Uint8Array(bufferLength);
            src.connect(analyser);

            setInterval(function () {
                analyser.getByteFrequencyData(frequency);
                self.analyse(frequency);
            }, 1000 / 30);

        },
        analyse: function (frequency) {
            // console.log(frequency);

            this.ctx.clearRect(0, 0, 400, 400);
            let w = 400 / frequency.length;
            this.ctx.fillStyle = "#3e3e3e";
            for (i = 0; i < frequency.length; i++) {
                this.ctx.fillRect(i * w, 400 - frequency[i], w, frequency[i]);
                // this.ctx.rect(10,10,10,10);
            }

            this.ctx.fill();
        }
    });


    voiceFireFlower.VoiceController = VoiceController;

})();
var voiceFireFlower = voiceFireFlower || {};

(function () {

    // FireFlower Class
    function FireFlower(isAutoExplosion) {
        THREE.Object3D.call(this);

        this.isShooting = true;
        this.baseY = 0;
        this.accelY = Math.random() * 1.5 + 1.5;
        this.life = 100;
        this.color = util.getRandomColor();
        this.isAutoExplosion = isAutoExplosion;

        this.position.set(
            Math.random() * 150 - 70,
            -30,
            Math.random() * 150 - 70
        );

        this.shootTrack = new voiceFireFlower.ShootTrack(voiceFireFlower.assets.particleTexture, this.color);
        this.add(this.shootTrack);

    }
    FireFlower.prototype = Object.assign(Object.create(THREE.Object3D.prototype), {
        explosion: function () {
            const FireType = this.getFireType();
            this.fireExplosition = new FireType(voiceFireFlower.assets.particleTexture, this.color);
            this.fireExplosition.position.y = this.baseY;
            this.add(this.fireExplosition);
            this.isShooting = false;
        },
        update: function () {
            if (this.isShooting) {
                if (this.accelY < 0.1 && this.isAutoExplosion) {
                    this.explosion();
                } else {
                    this.accelY *= 0.96;
                    this.baseY += this.accelY;
                }
            } else {
                this.fireExplosition.update();

            }
            this.shootTrack.update({ x: 0, y: this.baseY, z: 0 }, this.isShooting);
        },
        getLife: function () {
            if (this.fireExplosition != null) {
                return this.fireExplosition.life;
            } else {
                return 100;
            }
        },
        getFireType: function () {
            let rand = Math.random();
            let targetType;
            if (rand < 0.15) {
                targetType = voiceFireFlower.type.Spread;
            } else if (rand < 0.3) {
                targetType = voiceFireFlower.type.Ring;
            } else if (rand < 0.45) {
                targetType = voiceFireFlower.type.Saturn;
            } else if (rand < 0.6) {
                targetType = voiceFireFlower.type.TwoStep;
            } else if (rand < 0.7) {
                targetType = voiceFireFlower.type.Shooting;
            } else if (rand < 0.8) {
                targetType = voiceFireFlower.type.Cat;
            } else {
                targetType = voiceFireFlower.type.Sphere;
            }

            return targetType;
            // return voiceFireFlower.type.Bird;
        }
    });


    voiceFireFlower.FireFlower = FireFlower;

})();
var voiceFireFlower = voiceFireFlower || {};

(function () {

    function Explosion(texture, color) {
        THREE.Object3D.call(this);

        this.geometry;
        this.material;
        this.particles;
        this.particleNum = 2000;
        this.life = this.particleNum;
        this.texture = texture;
        this.color = color;
        this.particleSize = 5;
    }

    Explosion.prototype = Object.assign(Object.create(THREE.Object3D.prototype), {

        createParticle: function () {
            this.material = new THREE.PointsMaterial({
                map: this.texture,
                color: this.color,
                size: this.particleSize,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthTest: false
            });

            this.particles = new THREE.Points(this.geometry, this.material);
            this.add(this.particles);
        },

        update: function () {
            this.life = 0;
            for (let i = 0; i < this.particleNum; i++) {
                this.life += this.geometry.vertices[i].life;
                this.geometry.vertices[i].update();
            }
            this.particles.geometry.verticesNeedUpdate = true;

        }

    });


    voiceFireFlower.Explosion = Explosion;

})();
var voiceFireFlower = voiceFireFlower || {};

(function () {

    // FireParticle Class
    function FireParticle(position, vector, burstSize, life, invisibleCnt) {

        this.x = position.x;
        this.z = position.z;
        this.targetY = position.y;
        this.invisibleAdditionY = 10000;
        // this.y=this.targetY+this.invisibleAdditionY;

        let v3 = new THREE.Vector3(
            vector.x,
            vector.y,
            vector.z
        );

        let v3Normal = v3.normalize();

        this.vectorX = v3Normal.x * burstSize;
        this.vectorY = v3Normal.y * burstSize + 0.3;
        this.vectorZ = v3Normal.z * burstSize;

        this.gravityY = 0.1;

        if (!invisibleCnt) { invisibleCnt = { range: 10, base: 0 }; }
        this.invisibleCnt = Math.floor(Math.random() * invisibleCnt.range + invisibleCnt.base);

        if (!life) { life = { range: 70, base: 80 }; }
        this.life = Math.floor(Math.random() * life.range) + life.base;
    }
    FireParticle.prototype = Object.assign(Object.create(THREE.Vector3.prototype), {
        update: function () {
            if (this.invisibleCnt > 0) {
                this.invisibleCnt--;
            } else if (this.life > 0) {
                this.invisibleAdditionY = 0;
                this.life--;
            } else {
                this.invisibleAdditionY = 10000;
            }

            this.vectorX *= 0.98;
            this.vectorY *= 0.98;
            this.vectorZ *= 0.98;
            this.x += this.vectorX;
            this.z += this.vectorZ;
            this.targetY += this.vectorY - this.gravityY;
            this.y = this.targetY + this.invisibleAdditionY;

        }
    });


    voiceFireFlower.FireParticle = FireParticle;

})();
var voiceFireFlower = voiceFireFlower || {};
voiceFireFlower.type = voiceFireFlower.type || {};

(function () {

    function ModelType(texture, color, option) {
        voiceFireFlower.Explosion.call(this);

        this.option = option || {};
        this.texture = texture;
        this.color = color;
        this.particleNum = 0;
        this.burstSize = this.option.burstSize || Math.random() * 0.002 + 0.002;
        this.life = this.option.life || { range: 70, base: 60 };
        this.invisibleCnt = this.option.invisibleCnt || null;

    }

    ModelType.prototype = Object.assign(Object.create(voiceFireFlower.Explosion.prototype), {
        init: function (geometry) {
            let modelGeometry = new THREE.Geometry().fromBufferGeometry(geometry);

            this.rotation.x = Math.random() * 2 - 1;
            this.rotation.y = Math.random() * 180 - 90;

            this.geometry = new THREE.Geometry();
            let centerPosition = { x: 0, y: 0, z: 0 };
            const loadedGeaometryVerticesNum = modelGeometry.vertices.length;

            for (let i = 0; i < loadedGeaometryVerticesNum; i++) {
                centerPosition.x += modelGeometry.vertices[i].x / loadedGeaometryVerticesNum;
                centerPosition.y += modelGeometry.vertices[i].y / loadedGeaometryVerticesNum;
                centerPosition.z += modelGeometry.vertices[i].z / loadedGeaometryVerticesNum;
            }

            for (let i = 0; i < loadedGeaometryVerticesNum; i += 10) {
                this.particleNum++;
                let position = {
                    x: Math.random() * 2 - 1,
                    y: Math.random() * 2 - 1,
                    z: Math.random() * 2 - 1
                };

                let vector = new THREE.Vector3(
                    modelGeometry.vertices[i].x - centerPosition.x,
                    modelGeometry.vertices[i].y - centerPosition.y,
                    modelGeometry.vertices[i].z - centerPosition.z
                );
                let burstSize = vector.length() * this.burstSize;

                let invisibleCnt = Math.floor(Math.random() * 10) + 10;

                this.geometry.vertices.push(new voiceFireFlower.FireParticle(position, vector, burstSize, this.life, invisibleCnt));
            }

            this.createParticle();
        }
    });


    voiceFireFlower.type.ModelType = ModelType;

})(); 0
var voiceFireFlower = voiceFireFlower || {};

(function () {

    // ShootParticle Class
    function ShootParticle(option) {

        this.option = option || {};

        this.option.life = this.option.life || 20;
        this.option.fireVectorSize = this.option.fireVectorSize || 0.5;

        this.isShootTracking = false;

    }
    ShootParticle.prototype = Object.assign(Object.create(THREE.Vector3.prototype), {

        start: function (basePosition) {
            let v3 = new THREE.Vector3(
                Math.random() * 360 - 180,
                Math.random() * 360 - 180,
                Math.random() * 360 - 180
            );
            let v3Normal = v3.normalize();

            const fireSize = 0.1;
            this.x = v3Normal.x * fireSize + basePosition.x;
            this.y = v3Normal.y * fireSize + basePosition.y;
            this.z = v3Normal.z * fireSize + basePosition.z;

            v3 = new THREE.Vector3(
                Math.random() * 360 - 180,
                Math.random() * 360 - 180,
                Math.random() * 360 - 180
            );
            // v3.y=0;

            const fireVectorSize = this.option.fireVectorSize;
            v3Normal = v3.normalize();
            this.vectorX = v3Normal.x * fireVectorSize;
            this.vectorY = v3Normal.y * fireVectorSize;
            this.vectorZ = v3Normal.z * fireVectorSize;

            this.life = Math.floor(Math.random() * this.option.life);

            this.isShootTracking = true;
        },

        traking: function () {
            this.vectorX *= 0.95;
            this.vectorY *= 0.95;
            this.vectorZ *= 0.95;
            this.x += this.vectorX * 0.1;
            this.y += this.vectorY * 0.1;
            this.z += this.vectorZ * 0.1;
            if (this.life > 0) {
                this.life--;
            } else {
                this.isShootTracking = false;
            }
        },

        remove: function () {
            this.y = 99999;
        },

        update: function (basePosition, isShooting) {
            if (this.isShootTracking) {
                this.traking();
            } else if (isShooting) {
                this.start(basePosition);
            } else {
                this.remove();
            }
        }
    });


    voiceFireFlower.ShootParticle = ShootParticle;

})();
var voiceFireFlower = voiceFireFlower || {};

(function () {

    // ShootTrack Class
    function ShootTrack(texture, color, option) {
        THREE.Object3D.call(this);

        option = option || {};

        this.geometry;
        this.material;
        this.particles;
        this.particleNum = option.particleNum || 50;
        this.particleLife = option.particleLife || null;
        this.fireVectorSize = option.fireVectorSize || null;

        this.init(texture, color);
    }
    ShootTrack.prototype = Object.assign(Object.create(THREE.Object3D.prototype), {
        init: function (texture, color) {
            this.geometry = new THREE.Geometry();
            for (let i = 0; i < this.particleNum; i++) {
                this.geometry.vertices[i] = new voiceFireFlower.ShootParticle({
                    life: this.particleLife,
                    fireVectorSize: this.fireVectorSize
                });
            }

            this.material = new THREE.PointsMaterial({
                map: texture,
                color: color,
                size: 3,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthTest: false
            });

            this.particles = new THREE.Points(this.geometry, this.material);
            this.add(this.particles);

        },

        update: function (basePosition, isShooting) {
            this.life = 0;
            for (let i = 0; i < this.particleNum; i++) {
                this.geometry.vertices[i].update(basePosition, isShooting);
            }
            this.particles.geometry.verticesNeedUpdate = true;

        },
    });


    voiceFireFlower.ShootTrack = ShootTrack;

})();
var voiceFireFlower = voiceFireFlower || {};
voiceFireFlower.type = voiceFireFlower.type || {};

(function () {

    function Bird(texture, color, option) {
        voiceFireFlower.type.ModelType.call(this);

        this.texture = texture;
        this.color = color;
        this.init(voiceFireFlower.assets.birdModel.children[0].geometry);
    }

    Bird.prototype = Object.assign(Object.create(voiceFireFlower.type.ModelType.prototype), {
    });


    voiceFireFlower.type.Bird = Bird;

})();
var voiceFireFlower = voiceFireFlower || {};
voiceFireFlower.type = voiceFireFlower.type || {};

(function () {

    function Cat(texture, color, option) {
        voiceFireFlower.type.ModelType.call(this);

        this.texture = texture;
        this.color = color;
        this.init(voiceFireFlower.assets.catModel.children[0].geometry);
    }

    Cat.prototype = Object.assign(Object.create(voiceFireFlower.type.ModelType.prototype), {
    });


    voiceFireFlower.type.Cat = Cat;

})();
var voiceFireFlower = voiceFireFlower || {};
voiceFireFlower.type = voiceFireFlower.type || {};

(function () {

    function Ring(texture, color, option) {
        voiceFireFlower.Explosion.call(this);

        this.option = option || {};
        this.texture = texture;
        this.color = color;
        this.particleNum = 1000;
        this.burstSize = this.option.burstSize || Math.random() * 0.6 + 0.3;
        this.life = this.option.life || { range: 70, base: 80 };
        this.invisibleCnt = this.option.invisibleCnt || null;

        this.init();
        this.createParticle();
    }

    Ring.prototype = Object.assign(Object.create(voiceFireFlower.Explosion.prototype), {
        init: function () {
            this.geometry = new THREE.Geometry();

            let rotate = (1 - Math.random() * 2);

            for (let i = 0; i < this.particleNum; i++) {
                let position = {
                    x: Math.random() * 3 - 1.5,
                    y: Math.random() * 3 - 1.5,
                    z: Math.random() * 3 - 1.5
                };
                let vector = new THREE.Vector3(
                    0,
                    Math.random() * 1.0 - 0.5,
                    Math.random() * 1.0 - 0.5
                );
                vector.x = vector.y * rotate;
                vector.y += vector.z;


                this.geometry.vertices[i] = new voiceFireFlower.FireParticle(position, vector, this.burstSize, this.life, this.invisibleCnt);
            }
        }
    });


    voiceFireFlower.type.Ring = Ring;

})();
var voiceFireFlower = voiceFireFlower || {};
voiceFireFlower.type = voiceFireFlower.type || {};

(function () {

    function Saturn(texture, color) {
        THREE.Object3D.call(this);

        this.life = 100;
        let burstSize = Math.random() * 0.5 + 0.5;
        this.SpehereExplosion = new voiceFireFlower.type.Sphere(texture, color, { burstSize: burstSize });
        this.RingExplosion = new voiceFireFlower.type.Ring(texture, util.getRandomColor(), { burstSize: burstSize + 0.3 });

        this.add(this.SpehereExplosion);
        this.add(this.RingExplosion);

    }

    Saturn.prototype = Object.assign(Object.create(THREE.Object3D.prototype), {
        update: function () {
            this.RingExplosion.update();
            this.SpehereExplosion.update();
            this.life = this.RingExplosion.life + this.SpehereExplosion.life;
        }
    });


    voiceFireFlower.type.Saturn = Saturn;

})();
var voiceFireFlower = voiceFireFlower || {};
voiceFireFlower.type = voiceFireFlower.type || {};

(function () {

    function Shooting(texture, color) {
        THREE.Object3D.call(this);

        this.life = 100;

        this.shootings = [];
        this.shootingPositions = [];
        this.shootNum = 50;


        for (let i = 0; i < this.shootNum; i++) {
            let shoot = new voiceFireFlower.ShootTrack(voiceFireFlower.assets.particleTexture, color, {
                particleNum: 20,
                particleLife: 40,
                fireVectorSize: 0.1
            });
            this.shootingPositions.push(new ShootingPosition(i));
            this.shootings.push(shoot);
            this.add(shoot);
        }

    }

    Shooting.prototype = Object.assign(Object.create(THREE.Object3D.prototype), {
        update: function () {
            this.life = 0;
            for (let i = 0; i < this.shootNum; i++) {
                this.shootingPositions[i].update();
                this.life += this.shootingPositions[i].life;
                if (this.shootingPositions[i].life <= 30) {
                    this.shootingPositions[i].isShooting = false;
                }
                this.shootings[i].update(this.shootingPositions[i].getPosition(), this.shootingPositions[i].isShooting);
            }
        }
    });


    function ShootingPosition(i) {
        this.x = this.y = this.z = 0;
        this.vectorX = Math.random() * 1 - 0.5;
        this.vectorY = Math.random() * 1 - 0.5 + 0.6;
        this.vectorZ = Math.random() * 1 - 0.5;
        this.gravityY = 0.3;
        this.life = Math.floor(Math.random() * 50 + 150);
        this.isShooting = true;
    }

    Object.assign(ShootingPosition.prototype, {
        update: function () {
            if (this.life > 0) {
                this.life--;
            }
            this.vectorX *= 0.98;
            this.vectorY *= 0.98;
            this.vectorZ *= 0.98;
            this.x += this.vectorX;
            this.y += this.vectorY - this.gravityY;
            this.z += this.vectorZ;
        },
        getPosition: function () {
            return { x: this.x, y: this.y, z: this.z };
        }
    });



    voiceFireFlower.type.Shooting = Shooting;

})();
var voiceFireFlower = voiceFireFlower || {};
voiceFireFlower.type = voiceFireFlower.type || {};

(function () {

    function Sphere(texture, color, option) {
        voiceFireFlower.Explosion.call(this);

        this.option = option || {};
        this.texture = texture;
        this.color = color;
        this.particleNum = this.option.particleNum || 2000;
        this.burstSize = this.option.burstSize || Math.random() * 0.5 + 0.5;
        this.life = this.option.life || { range: 70, base: 80 };
        this.invisibleCnt = this.option.invisibleCnt || null;

        this.init();
        this.createParticle();
    }

    Sphere.prototype = Object.assign(Object.create(voiceFireFlower.Explosion.prototype), {
        init: function () {
            this.geometry = new THREE.Geometry();
            for (let i = 0; i < this.particleNum; i++) {
                let position = {
                    x: Math.random() * 2 - 1,
                    y: Math.random() * 2 - 1,
                    z: Math.random() * 2 - 1
                };
                let vector = {
                    x: Math.random() - 0.5,
                    y: Math.random() - 0.5,
                    z: Math.random() - 0.5
                };

                let invisibleCnt = Math.floor(Math.random() * 10) + 10;

                this.geometry.vertices[i] = new voiceFireFlower.FireParticle(position, vector, this.burstSize, this.life, invisibleCnt);
            }
        }
    });


    voiceFireFlower.type.Sphere = Sphere;

})();
var voiceFireFlower = voiceFireFlower || {};
voiceFireFlower.type = voiceFireFlower.type || {};

(function () {

    function Spread(texture, color, option) {
        voiceFireFlower.Explosion.call(this);

        this.option = option || {};
        this.texture = texture;
        this.color = color;
        this.particleNum = this.option.particleNum || 250;
        this.particleSize = 5;
        this.burstSize = this.option.burstSize || Math.random() * 0.1 + 0.1;
        this.life = this.option.life || { range: 10, base: 2 };
        this.invisibleCnt = this.option.invisibleCnt || { range: 70, base: 30 };

        this.init();
        this.createParticle();
    }

    Spread.prototype = Object.assign(Object.create(voiceFireFlower.Explosion.prototype), {
        init: function () {
            this.geometry = new THREE.Geometry();

            for (let i = 0; i < this.particleNum; i++) {
                let position = {
                    x: Math.random() * 2 - 1,
                    y: Math.random() * 2 - 1,
                    z: Math.random() * 2 - 1
                };
                let vector = {
                    x: Math.random() - 0.5,
                    y: Math.random() - 0.5,
                    z: Math.random() - 0.5
                };

                this.geometry.vertices[i] = new voiceFireFlower.FireParticle(position, vector, this.burstSize, this.life, this.invisibleCnt);
            }
        }
    });


    voiceFireFlower.type.Spread = Spread;

})();
var voiceFireFlower = voiceFireFlower || {};
voiceFireFlower.type = voiceFireFlower.type || {};

(function () {

    function TwoStep(texture, color) {
        THREE.Object3D.call(this);

        this.life = 100;
        let burstSize = Math.random() * 0.3 + 0.2;
        this.SpehereExplosion = new voiceFireFlower.type.Sphere(texture, color, {
            particleNum: 100,
            life: { range: 50, base: 50 },
            burstSize: burstSize
        });

        this.SpreadExplosion = new voiceFireFlower.type.Spread(texture, util.getRandomColor(), {
            particleNum: 2000,
            burstSize: burstSize + 0.2,
            invisibleCnt: { range: 80, base: 40 }
        });

        this.add(this.SpehereExplosion);
        this.add(this.SpreadExplosion);

    }

    TwoStep.prototype = Object.assign(Object.create(THREE.Object3D.prototype), {
        update: function () {
            this.SpreadExplosion.update();
            this.SpehereExplosion.update();
            this.life = this.SpreadExplosion.life + this.SpehereExplosion.life;
        }
    });


    voiceFireFlower.type.TwoStep = TwoStep;

})();