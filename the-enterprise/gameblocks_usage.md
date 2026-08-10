# GameBlocks Usage

This project uses [GameBlocks](https://github.com/xt4d/GameBlocks) modules as the movement/camera/collision core, per the GameBlocks skill workflow. Modules were copied preserving their relative structure under `src/modules/`.

| Module | Purpose | Status |
|---|---|---|
| `math/WorldBasis.js` | Single source of truth for axes, yaw, planar movement | Reused as-is |
| `math/ScalarUtils.js`, `math/Vector3Utils.js`, `math/TimeUtils.js`, `math/RandomUtils.js` | Math helpers required by the above | Reused as-is |
| `actor-motion/character/BaseCharacterMotionController.js` | Grounded locomotion, accel/decel, gravity | Reused as-is (jump disabled via config `jumpVelocity: 0`) |
| `actor-motion/character/MouseLookCharacterMotionController.js` | WASD + mouse-look input → locomotion intent | Reused as-is |
| `actor-motion/KinematicBatchResolver.js` | Rapier-based kinematic collision resolution | Reused as-is |
| `camera/FirstPersonCameraRig.js` + `camera/BaseCameraRig.js` | First-person camera pose from character state | Reused; configured with `heightVectorSource: basisUp` so eye height stays fixed while pitching |

## Integration

`src/game/player.js` composes the three recommended pieces (MouseLook controller → KinematicBatchResolver → FirstPersonCameraRig) exactly as the module docs suggest: `planMovement()` produces an intent, the resolver corrects it against static room colliders (Rapier cuboids built by `src/game/kit.js`), and `commitMovement()` + `rig.step()` drive the camera.

One integration addition: when input is disabled (menus, revelation cards), the player still runs an idle `rig.step()` so the camera stays glued to the character.
