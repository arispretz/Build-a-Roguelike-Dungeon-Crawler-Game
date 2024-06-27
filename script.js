'use strict';

const rand = (min, max) => (
  Math.floor ((Math.random () * (max - (min - 1)) + min))
);

class Map {
  constructor (maxRooms, roomSizeMin, roomSizeMax) {
    this.rooms = [];
    this.gridMap = null;
    this.gridInfo = null;

    for ( let j = 0; j < maxRooms; j++ ) {
      this.rooms.push ({
        id: j,
        width: rand (roomSizeMin, roomSizeMax),
        height: rand (roomSizeMin, roomSizeMax),
        maxLinks: rand (1, 4),
        linkedTo: [],
        corridorBuild: false,
        fakeCoord: null,
        gridCoord: null
      });
    }

    this.doLinks ();

    this.doGridMap ();

    let startRoom = { dist: null, roomId: null }
    let endRoom = { dist: null, roomId: null }
    for ( let j = 0; j < this.rooms.length; j++ ) {
      let currRoom = this.rooms[j];

      let currRoomCenter = {
        x: currRoom.gridCoord.startX + Math.floor (currRoom.width / 2),
        y: currRoom.gridCoord.startY + Math.floor (currRoom.height / 2)
      };

      let currRoomDist = Math.sqrt (
        Math.pow (currRoomCenter.x, 2) + Math.pow (currRoomCenter.y, 2)
      );

      if ( startRoom.dist === null || currRoomDist < startRoom.dist ) {
        startRoom.dist = currRoomDist;
        startRoom.roomId = j;
      }

      if ( endRoom.dist === null || currRoomDist > endRoom.dist ) {
        endRoom.dist = currRoomDist;
        endRoom.roomId = j;
      }
    }

    this.startRoom = this.rooms[startRoom.roomId];
    this.endRoom = this.rooms[endRoom.roomId];
  }

  doLinks () {
    
    for ( let j = 0; j < this.rooms.length; j++ ) {
      let currRoom = this.rooms[j];
      let remainLinks = currRoom.maxLinks - currRoom.linkedTo.length;
      let currRoomLinks = Math.min (remainLinks, currRoom.maxLinks);

      for ( let k = 0; k < currRoomLinks; k++ ) {
        let foundIdx = this.findLinkeableRoom (currRoom);

        if ( foundIdx === false )
             break;

        this.rooms[j].linkedTo.push (foundIdx);
        this.rooms[foundIdx].linkedTo.push (currRoom.id);
      }
    }

    for ( let j = this.rooms.length - 1; j > -1; j-- )
      if ( this.rooms[j].linkedTo.length < 1 )
        this.rooms.splice (j, 1);
  }

  findLinkeableRoom (currRoom) {
    let firstRoomLinkeable = false;

    for ( let j = 0; j < this.rooms.length; j++ ) {
      let randRoom = rand (0, this.rooms.length - 1);

      if ( this.rooms[j].linkedTo.length < this.rooms[j].maxLinks
        && currRoom.linkedTo.indexOf (this.rooms[j].id) == -1
        && this.rooms[j].id != currRoom.id && firstRoomLinkeable === false )
        firstRoomLinkeable = this.rooms[j].id;

      if ( this.rooms[randRoom].linkedTo.length < this.rooms[randRoom].maxLinks
        && currRoom.linkedTo.indexOf (this.rooms[randRoom].id) == -1
        && this.rooms[randRoom].id != currRoom.id )
        return this.rooms[randRoom].id;
    }

    return firstRoomLinkeable;
  }

  findRoomIdx (roomIndex) {
    for ( let j = 0; j < this.rooms.length; j++ )
      if ( this.rooms[j].id == roomIndex )
        return j;

    return false;
  }

  doGridMap () {
    let maxLinkFound = { links: 0, roomIdx: -1 };

    for ( let j = 0; j < this.rooms.length; j++ )
      if ( this.rooms[j].linkedTo.length > maxLinkFound.links )
        maxLinkFound = {
          links: this.rooms[j].linkedTo.length,
          roomIdx: j
        };

    this.rooms[maxLinkFound.roomIdx].fakeCoord = { startX: 0, startY: 0 };
    this.generateFakeCoord (this.rooms[maxLinkFound.roomIdx]);

    for ( let j = this.rooms.length - 1; j > -1; j-- )
      if ( this.rooms[j].fakeCoord === null )
        this.rooms.splice (j, 1);

    let translateCoord = { x: 0, y: 0 };
    for ( let j = 0; j < this.rooms.length; j++ ) {
      if ( this.rooms[j].fakeCoord.startX < translateCoord.x )
        translateCoord.x = this.rooms[j].fakeCoord.startX;

      if ( this.rooms[j].fakeCoord.startY < translateCoord.y )
        translateCoord.y = this.rooms[j].fakeCoord.startY;
    }

    this.gridInfo = { width: 0, height: 0 };
    for ( let j = 0; j < this.rooms.length; j++ ) {
      this.rooms[j].gridCoord = {
        startX: this.rooms[j].fakeCoord.startX + Math.abs (translateCoord.x) + 1,
        startY: this.rooms[j].fakeCoord.startY + Math.abs (translateCoord.y) + 1,
        endX: 0,
        endY: 0
      };

      let endCoord = {
        endX: this.rooms[j].gridCoord.startX + this.rooms[j].width,
        endY: this.rooms[j].gridCoord.startY + this.rooms[j].height
      };

      this.rooms[j].gridCoord.endX = endCoord.endX;
      this.rooms[j].gridCoord.endY = endCoord.endY;

      if ( endCoord.endX > this.gridInfo.width )
        this.gridInfo.width = endCoord.endX;

      if ( endCoord.endY > this.gridInfo.height )
        this.gridInfo.height = endCoord.endY;
    }

    this.gridMap = Array (this.gridInfo.height + 1).fill().map(
      () => Array (this.gridInfo.width + 1).fill ('W')
    );

    this.doCorridors (this.rooms[0]);

    for ( let j = 0; j < this.rooms.length; j++ ) {
      let Room = this.rooms[j];
      for ( let y = Room.gridCoord.startY; y < Room.gridCoord.endY; y++ )
        for ( let x = Room.gridCoord.startX; x < Room.gridCoord.endX; x++ )
          this.gridMap[y][x] = 'R';
    }
  }

  generateFakeCoord (currRoom) {
    let checkComplete = true;

    for ( let j = 0; j < currRoom.linkedTo.length; j++ ) {
      let currLinkedRoom = this.rooms[this.findRoomIdx (currRoom.linkedTo[j])];

      if ( currLinkedRoom.fakeCoord !== null )
        continue;
      else checkComplete = false;

      let roomDistance = {
        width: currLinkedRoom.width + rand (1, currRoom.height),
        height: currLinkedRoom.height + rand (1, currRoom.width)
      }

      switch (j) {
        case 0:
          this.rooms[this.findRoomIdx (currRoom.linkedTo[j])].fakeCoord = {
            startX: rand (0, Math.abs (currRoom.width - currLinkedRoom.width)),
            startY: currRoom.fakeCoord.startY - roomDistance.height
          };
          break;
        case 1:
          this.rooms[this.findRoomIdx (currRoom.linkedTo[j])].fakeCoord = {
            startX: currRoom.fakeCoord.startX + roomDistance.width,
            startY: rand (0, Math.abs (currRoom.height - currLinkedRoom.height))
          };
          break;
        case 2:
          this.rooms[this.findRoomIdx (currRoom.linkedTo[j])].fakeCoord = {
            startX: currRoom.fakeCoord.startX - roomDistance.width,
            startY: rand (0, Math.abs (currRoom.height - currLinkedRoom.height))
          };
          break;
        case 3:
          this.rooms[this.findRoomIdx (currRoom.linkedTo[j])].fakeCoord = {
            startX: rand (0, Math.abs (currRoom.width - currLinkedRoom.width)),
            startY: currRoom.fakeCoord.startY + roomDistance.height
          };
          break;
      }
    }

    if ( checkComplete === true )
      return;

    for ( let j = 0; j < currRoom.linkedTo.length; j++ )
      this.generateFakeCoord (
        this.rooms[this.findRoomIdx (currRoom.linkedTo[j])]
      );
  }

  doCorridors (currRoom) {
    if ( currRoom.corridorBuild === true )
      return;

    let currRoomCenter = {
      x: currRoom.gridCoord.startX + Math.floor (currRoom.width / 2),
      y: currRoom.gridCoord.startY + Math.floor (currRoom.height / 2)
    };

    for ( let j = 0; j < currRoom.linkedTo.length; j++ ) {
      let currLinkRoom = this.rooms[this.findRoomIdx (currRoom.linkedTo[j])];

      let currLinkRoomCenter = {
        x: currLinkRoom.gridCoord.startX + Math.floor (currLinkRoom.width / 2),
        y: currLinkRoom.gridCoord.startY + Math.floor (currLinkRoom.height / 2)
      };

      let corridorPath = {
        startX: Math.min (currRoomCenter.x, currLinkRoomCenter.x),
        startY: Math.min (currRoomCenter.y, currLinkRoomCenter.y),
        endX: Math.max (currRoomCenter.x, currLinkRoomCenter.x),
        endY: Math.max (currRoomCenter.y, currLinkRoomCenter.y) + 1
      };

      for ( let x = corridorPath.startX; x < corridorPath.endX; x++ )
        this.gridMap[currRoomCenter.y][x] = 'C';

      for ( let y = corridorPath.startY; y < corridorPath.endY; y++ )
        this.gridMap[y][currRoomCenter.x] = 'C';
    }

    this.rooms[this.findRoomIdx (currRoom.id)].corridorBuild = true;
    for ( let j = 0; j < currRoom.linkedTo.length; j++ ) {
      let currLinkRoom = this.rooms[this.findRoomIdx (currRoom.linkedTo[j])];
      this.doCorridors (currLinkRoom);
    }
  }
}

class MapInitializer {
  constructor (Map, level, levelMax) {
    this.map = Map;
    this.level = level;
    this.enterPoint = null;
    this.exitPoint = null;
    this.playerCoord = null;
    this.enemies = null;
    this.lifeKit = null;
    this.weapons = null;
    this.boss = null;
    this.usedCoord = [];

    if ( level > 1 )
      this.placeEnterPoint ();

    if ( level < levelMax )
         this.placeExitPoint ();
    else this.placeBoss ();

    this.placeEnemies ();
    this.placeLifeKit ();
    this.placeWeapons ();
  }

  placeEnterPoint () {
    this.enterPoint = {
      x: rand (this.map.startRoom.gridCoord.startX,
               this.map.startRoom.gridCoord.endX - 1),
      y: rand (this.map.startRoom.gridCoord.startY,
               this.map.startRoom.gridCoord.endY - 2)
    };
  }

  placeExitPoint () {
    this.exitPoint = {
      x: rand (this.map.endRoom.gridCoord.startX,
               this.map.endRoom.gridCoord.endX - 1),
      y: rand (this.map.endRoom.gridCoord.startY,
               this.map.endRoom.gridCoord.endY - 1)
    };
  }

  findFreeRandomCoord () {
    for ( let j = 0; j < this.map.rooms.length; j++ ) {
      let currRoom = this.map.rooms[rand(0, this.map.rooms.length - 1)];
      let randomTry = currRoom.width + currRoom.height;

      for ( let k = 0; k < randomTry; k++ ) {
        let currentCoord = {
          x: rand (currRoom.gridCoord.startX, currRoom.gridCoord.endX - 1),
          y: rand (currRoom.gridCoord.startY, currRoom.gridCoord.endY - 1)
        };

        if ( this.map.gridMap[currentCoord.y][currentCoord.x] != 'R' )
          continue;

        let chkCoord = 0;
        for ( ; chkCoord < this.usedCoord.length; chkCoord++ ) {
          if ( this.usedCoord[chkCoord].x == currentCoord.x
            && this.usedCoord[chkCoord].y == currentCoord.y ) {
            chkCoord = -1;
            break;
          }
        }

        if ( chkCoord != -1 ) {
          this.usedCoord.push (currentCoord);
          return currentCoord;
        }
      }
    }

    return false;
  }

  placeEnemies () {
    let enemyId = 0;

    this.enemies = Array (
      rand (Math.floor (this.map.rooms.length / 2), this.map.rooms.length)
    ).fill ().map (
      () => ({
        life: 20 + rand (30, 45) * this.level,
        damage: 5 + rand (1, 5) * this.level,
        id: enemyId++,
        coord: this.findFreeRandomCoord ()
      })
    );
  }

  placeLifeKit () {
    let lifeKitId = 0;

    this.lifeKit = Array (rand (5, 9)).fill ().map (
      () => ({
        life: 20 + rand (10, 20) * this.level,
        id: lifeKitId++,
        coord: this.findFreeRandomCoord ()
      })
    );
  }

  randomWeaponsName () {
    let switchVCS = [
      [ 'a', 'e', 'i', 'o' ],
      [
        'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's',
        't', 'v', 'w', 'x', 'y', 'z'
      ],
      [
      	'bl', 'br', 'ch', 'cl', 'cr', 'dr', 'fl', 'fr', 'gh', 'gl', 'gn', 'gr',
        'gw', 'pl', 'pn', 'pr', 'ps', 'qu', 'sb', 'sc', 'sf', 'sm', 'sp', 'st',
        'tl', 'tr', 'wr'
      ],
      [
        'bb', 'bh', 'bs', 'bt', 'cc', 'ct', 'dd', 'dl', 'ff', 'fg', 'gg', 'lb',
        'lc', 'ld', 'lf', 'lg', 'lm', 'ln', 'lp', 'ls', 'lt', 'lv', 'lw', 'lz',
        'mb', 'ml', 'mm', 'mn', 'mp', 'nc', 'nd', 'nf', 'ng', 'nj', 'nn', 'nt',
        'nv', 'nx', 'nz', 'pp', 'pt', 'rb', 'rc', 'rd', 'rf', 'rg', 'rj', 'rl',
        'rm', 'rn', 'rp', 'rr', 'rs', 'rt', 'rv', 'rw', 'rz', 'ss', 'tm', 'tt',
        'vl', 'vr', 'vv', 'wl', 'xx', 'zl', 'zm', 'zr', 'zz'
      ],
      [ 'cqu', 'lqu', 'nqu', 'rqu', 'squ' ]
    ];

    let namePart = rand (4, 6);
    let baseName = '';
    let referS = null;
    let j = rand (0, 1);

    if ( j % 2 ) {
    	referS = switchVCS[rand (1, 2)];
      baseName += referS[rand (0, referS.length - 1)];
    }
    else baseName += switchVCS[0][rand (0, switchVCS[0].length - 1)];

    for ( j++; j < namePart; j++ ) {
      if ( j % 2 ) {
        if ( j == (namePart - 1) )
          referS = switchVCS[1];
        else referS = switchVCS[rand (1, 4)]

        baseName += referS[rand (0, referS.length - 1)];
      }
      else baseName += switchVCS[0][rand (0, switchVCS[0].length - 1)];
    }

    return baseName;
  }

  placeWeapons () {
    let weaponTypes = [
      { type: 'sword',    multipl: 1.4 },
      { type: 'bludgeon', multipl: 1.3 },
      { type: 'bow',      multipl: 1.1 },
      { type: 'cestus',   multipl: 1.0 },
      { type: 'axe',      multipl: 1.5 },
      { type: 'hammer',   multipl: 1.2 }
    ];

    let weapons = rand (3, 6);
    this.weapons = [];

    for ( let j = 0; j < weapons; j++ ) {
      let currWeapon = weaponTypes[rand(0, weaponTypes.length - 1)];

      this.weapons.push ({
        id: j,
        name: this.randomWeaponsName () + ' ' + currWeapon.type,
        type: currWeapon.type,
        damage: Math.round (5 + rand (3, 8) * this.level * currWeapon.multipl),
        coord: this.findFreeRandomCoord ()
      });
    }
  }

  placeBoss () {
    this.boss = {
      life: rand (90, 140) * this.level,
      damage: rand (30, 45) * this.level,
      coord: {
        x: rand (this.map.endRoom.gridCoord.startX,
                 this.map.endRoom.gridCoord.endX),
        y: rand (this.map.endRoom.gridCoord.startY,
                 this.map.endRoom.gridCoord.endY - 1)
      }
    };
  }

  updateBossLife (bossLife) {
    this.boss.life = bossLife;
  }

  updateEnemyLife (enemyInfo) {
    for ( let j = 0; j < this.enemies.length; j++ ) {
      if ( this.enemies[j].id == enemyInfo.id ) {
        this.enemies[j].life = enemyInfo.life;
        break;
      }
    }
  }

  removeElement (elem) {
    switch (elem.id) {
      case 'L': this.lifeKit.splice (elem.idx, 1); break;
      case 'E': this.enemies.splice (elem.idx, 1); break;
      case 'w': this.weapons.splice (elem.idx, 1); break;
    }
  }

  getElementAt (coordX, coordY) {
    if ( coordX < 0 || coordY < 0 || coordY >= this.map.gridMap.length
      || coordX >= this.map.gridMap[0].length )
      return { id: 'X' };

    if ( this.enterPoint !== null )
      if ( this.enterPoint.x == coordX && this.enterPoint.y == coordY )
          return { id: 'I', elem: this.enterPoint };

    if ( this.exitPoint !== null )
      if ( this.exitPoint.x == coordX && this.exitPoint.y == coordY )
          return { id: 'O', elem: this.exitPoint };

    for ( let j = 0; j < this.lifeKit.length; j++ ) {
      if ( this.lifeKit[j].coord.x == coordX
        && this.lifeKit[j].coord.y == coordY )
          return { id: 'L', elem: this.lifeKit[j], idx: j };
    }

    for ( let j = 0; j < this.enemies.length; j++ ) {
      if ( this.enemies[j].coord.x == coordX
        && this.enemies[j].coord.y == coordY )
        return { id: 'E', elem: this.enemies[j], idx: j };
    }

    for ( let j = 0; j < this.weapons.length; j++ ) {
      if ( this.weapons[j].coord.x == coordX
        && this.weapons[j].coord.y == coordY )
        return { id: 'w', elem: this.weapons[j], idx: j };
    }

    if ( this.boss !== null )
      if ( this.boss.coord.x == coordX && this.boss.coord.y == coordY )
          return { id: 'B', elem: this.boss };

    return { id: this.map.gridMap[coordY][coordX] };
  }
}

const initGame = () => {
  let maxLevel = rand (5, 10);

  let initialState = {
    gameMaps: [],
    currLevel: 0,
    playerInfo: {
      life: 100,
      damage: 10,
      exp: 0,
      level: 1,
      weapon: null,
      coord: null
    },
    message: null,
    gameOver: false,
    gameWin: false
  };

  for ( let j = 0; j < maxLevel; j++ )
    initialState.gameMaps.push (
      new MapInitializer (new Map (rand (20, 30), 4, 7), j + 1, maxLevel)
    );

  do {
    initialState.playerInfo.coord = {
      x: rand (initialState.gameMaps[0].map.startRoom.gridCoord.startX,
               initialState.gameMaps[0].map.startRoom.gridCoord.endX - 1),
      y: rand (initialState.gameMaps[0].map.startRoom.gridCoord.startY,
               initialState.gameMaps[0].map.startRoom.gridCoord.endY - 1)
    };
  } while ( initialState.gameMaps[0].getElementAt (
    initialState.playerInfo.coord.x, initialState.playerInfo.coord.y
  ).id != 'R' );

  return initialState;
}

const gameReducer = (state, action) => {
  if ( state === undefined ) {
    return initGame ();
  }

  let newState = state;
  let currentMapSettings = state.gameMaps[state.currLevel];
  let playerInfo = Object.assign ({}, state.playerInfo);
  let playerDamage = playerInfo.damage + rand (3, 6) * playerInfo.level;

  switch (action.type) {
    case 'MOVE':
      let targetElem = currentMapSettings.getElementAt (
        state.playerInfo.coord.x + action.relCoord.x,
        state.playerInfo.coord.y + action.relCoord.y
      );
      switch (targetElem.id) {
        case 'I':
          let prevMapSettings = state.gameMaps[state.currLevel - 1];
          let prevPlayerCoord = null;

          do {
            prevPlayerCoord = {
              x: rand (prevMapSettings.map.endRoom.gridCoord.startX,
                       prevMapSettings.map.endRoom.gridCoord.endX - 1),
              y: rand (prevMapSettings.map.endRoom.gridCoord.startY,
                       prevMapSettings.map.endRoom.gridCoord.endY - 1)
            };
          } while (  prevMapSettings.getElementAt (
            prevPlayerCoord.x, prevPlayerCoord.y
          ).id != 'R' );

          newState = Object.assign ({}, state, {
            currLevel: state.currLevel - 1,
            playerInfo: Object.assign ({}, state.playerInfo, {
              coord: prevPlayerCoord
            })
          });
          break;
        case 'O':
          let nextMapSettings = state.gameMaps[state.currLevel + 1];
          let nextPlayerCoord = null;

          do {
            nextPlayerCoord = {
              x: rand (nextMapSettings.map.startRoom.gridCoord.startX,
                       nextMapSettings.map.startRoom.gridCoord.endX - 1),
              y: rand (nextMapSettings.map.startRoom.gridCoord.startY,
                       nextMapSettings.map.startRoom.gridCoord.endY - 1)
            };
          } while (  nextMapSettings.getElementAt (
            nextPlayerCoord.x, nextPlayerCoord.y
          ).id != 'R' );

          newState = Object.assign ({}, state, {
            currLevel: state.currLevel + 1,
            playerInfo: Object.assign ({}, state.playerInfo, {
              coord: nextPlayerCoord
            })
          });
          break;
        case 'L':
          currentMapSettings.removeElement (targetElem);
          newState = Object.assign ({}, state, {
            playerInfo: Object.assign ({}, state.playerInfo, {
              coord: {
                x: state.playerInfo.coord.x + action.relCoord.x,
                y: state.playerInfo.coord.y + action.relCoord.y
              },
              life: state.playerInfo.life + targetElem.elem.life
            }),
            message: {
              type: 'INFO',
              desc: '+' + targetElem.elem.life + ' Life Points!',
              timeout: 2500
            }
          });
          break;
        case 'E':
          let enemyInfo = Object.assign ({}, targetElem.elem);

          enemyInfo.life -= playerDamage;
          playerInfo.life -= enemyInfo.damage;

          if ( playerInfo.life <= 0 ) {
            playerInfo.life = 0;
            newState = Object.assign ({}, state, {
              playerInfo: playerInfo,
              gameOver: true
            });
            break;
          }

          let messageDesc = 'Fight!';
          if ( enemyInfo.life <= 0 ) {
            currentMapSettings.removeElement (currentMapSettings.getElementAt (
                enemyInfo.coord.x, enemyInfo.coord.y
            ));

            playerInfo.exp += enemyInfo.damage;
            if ( Math.sqrt (playerInfo.exp) > 3 * playerInfo.level ) {
              playerInfo.level++;
              messageDesc = 'Level UP!';
            }
            messageDesc += ' Enemy Defeated!';
          }
          else currentMapSettings.updateEnemyLife (enemyInfo);

          newState = Object.assign ({}, state, {
            playerInfo: playerInfo,
            message: {
              type: 'INFO',
              desc: messageDesc,
              timeout: 2500
            }
          });

          break;
        case 'w':
          newState = Object.assign ({}, state, {
            message: {
              type: 'CHOOSE_WEAPON',
              action: 'CHANGE_WEAPON',
              elem: targetElem.elem
            }
          });
          break;
        case 'B':
          let bossInfo = Object.assign ({}, targetElem.elem);

          bossInfo.life -= playerDamage;
          playerInfo.life -= bossInfo.damage;
console.log (bossInfo);
          if ( playerInfo.life <= 0 ) {
            playerInfo.life = 0;
            newState = Object.assign ({}, state, {
              playerInfo: playerInfo,
              gameOver: true
            });
            break;
          }

          if ( bossInfo.life <= 0 ) {
            newState = Object.assign ({}, state, {
              gameWin: true
            });
            break;
          }

          currentMapSettings.updateBossLife (bossInfo.life);
          newState = Object.assign ({}, state, {
            playerInfo: playerInfo,
            message: {
              type: 'INFO',
              desc: 'Boss Fight!',
              timeout: 2500
            }
          });
          break;
        case 'W':
          newState = Object.assign ({}, state, {
            message: {
              type: 'INFO',
              desc: 'Bump!',
              timeout: 1000
            }
          });
          break;
        case 'R':
        case 'C':
          newState = Object.assign ({}, state, {
            playerInfo: Object.assign ({}, state.playerInfo, {
              coord: {
                x: state.playerInfo.coord.x + action.relCoord.x,
                y: state.playerInfo.coord.y + action.relCoord.y
              }
            }),
            message: null
          });
          break;
      }
      break;
    case 'CHANGE_WEAPON':
      let newWeapon = action.elem;
      let oldDmg = 0;
      if ( state.playerInfo.weapon !== null )
        oldDmg = state.playerInfo.weapon.damage;

      currentMapSettings.removeElement (
        currentMapSettings.getElementAt (newWeapon.coord.x, newWeapon.coord.y)
      );
      newState = Object.assign ({}, state, {
        playerInfo: Object.assign ({}, state.playerInfo, {
          coord: {
            x: newWeapon.coord.x,
            y: newWeapon.coord.y
          },
          damage: state.playerInfo.damage + newWeapon.damage - oldDmg,
          weapon: newWeapon
        }),
        message: {
          type: 'INFO',
          desc: 'New Weapon!',
          timeout: 2500
        }
      });
      break;
  }

  return newState;
}

let ReduxStore = Redux.createStore (gameReducer, initGame ());

const ReactGameMessage = React.createClass ({
  getInitialState () {
    return { message: null, timeout: null }
  },
  componentDidMount () {
    switch (this.props.message.type) {
      case 'INFO':
        this.setState ({
          message: this.props.message,
          timeout: setTimeout (function () {
            this.setState ({ message: null });
          }.bind (this), this.props.message.timeout)
        });
        break;
      case 'CHOOSE_WEAPON':
        this.setState ({ message: this.props.message });
        break;
    }
  },
  render () {
    if ( this.state.message === null )
      return <div></div>;

    switch (this.state.message.type) {
      case 'INFO':
        return <div className="gameMessage">{this.state.message.desc}</div>;
      case 'CHOOSE_WEAPON':
        return (
          <div className="gameMessage">
            <span>Would you like a new Weapon?</span>
            <div className="gameChooseWeaponBtn">
              <button onClick={this.dispatchChangeWeapon}>Yes</button>
              <button onClick={this.closeInfo}>No</button>
            </div>
            <div className="gameWeaponInfo">
              <div className={this.state.message.elem.type + 'Weapon'}></div>
              <span>{this.state.message.elem.name}</span>
              <span><b>Damage:</b> +{this.state.message.elem.damage}</span>
            </div>
          </div>
        );
    }
  },
  componentWillUnmount () {
    if ( this.state.timeout )
      clearTimeout (this.state.timeout);
  },
  dispatchChangeWeapon () {
    this.props.store.dispatch ({
      type: 'CHANGE_WEAPON',
      elem: this.state.message.elem
    });
  },
  closeInfo () {
    this.setState ({ message: null });
  }
});

const ReactGameArea = React.createClass ({
  getInitialState () {
    return { inputLock: false, darkCell: true };
  },
  componentDidMount () {
    this.centerView ();
    document.onkeydown = this.handleKeyPressed;
  },
  render () {
    let state = this.props.store.getState ();
    let currentMapSettings = state.gameMaps[state.currLevel];

    let mapInfo = {
      height: currentMapSettings.map.gridMap.length,
      width: currentMapSettings.map.gridMap[0].length
    };

    let finalMap = [];
    for ( let coordY = 0; coordY < mapInfo.height; coordY++ ) {
      let mapRow = [];

      for ( let coordX = 0; coordX < mapInfo.width; coordX++ ) {
        let cellType = this.findCellType ({
          x: coordX,
          y: coordY,
          mapSettings: currentMapSettings,
          playerInfo: state.playerInfo
        }) + " gameAreaCell";

        mapRow.push (<div key={coordX} className={cellType}></div>);
      }

      finalMap.push (<div key={coordY} className="gameAreaRow">{mapRow}</div>);
    }

    let gameOver = <div></div>;
    if ( state.gameOver === true ) {
      document.onkeydown = null;
      gameOver = <div className="gameOver"><span>Game Over</span></div>;
    }

    let gameWin = <div></div>;
    if ( state.gameWin === true ) {
      document.onkeydown = null;
      gameWin = <div className="gameOver"><span>You Win!</span></div>;
    }

    let weaponData
    if ( state.playerInfo.weapon ) {
      weaponData = (
        <div className="gameWeapon">
          <div className={state.playerInfo.weapon.type + 'Weapon'}></div>
          <span>
            {state.playerInfo.weapon.name}
            <b>( +{state.playerInfo.weapon.damage} )</b>
          </span>
        </div>
      );
    }
    else weaponData = 'none';

    let gameMessage = "";
    if ( state.message )
      gameMessage = <ReactGameMessage store={this.props.store}
                      key={Math.random ()} message={state.message} />;

    return (
      <div>
        <div className="gameTitle">
          <h2>React Roguelike</h2>
          <h4>Kill the Boss in map {state.gameMaps.length - 1}</h4>
        </div>
        <div className="gameInfo">
          <div>
            <span>Life:</span>
            <span>{state.playerInfo.life}</span>
          </div>
          <div>
            <span>Damage:</span>
            <span>
              {state.playerInfo.damage} 
               {' +'} [{state.playerInfo.level * 3}, {state.playerInfo.level * 6}]
            </span>
          </div>
          <div>
            <span>Weapon:</span>
            <span>{weaponData}</span>
          </div>
          <div>
            <span>EXP:</span>
            <span>{state.playerInfo.exp}</span>
          </div>
          <div>
            <span>Level:</span>
            <span>{state.playerInfo.level}</span>
          </div>
          <div>
            <span>Map:</span>
            <span>{state.currLevel}</span>
          </div>
        </div>
        <div className="gameArea">
          {gameWin}
          {gameOver}
          {finalMap}
        </div>
        <button className="gameToggleDark" onClick={this.toggleDark}>
          Toggle Darkness
        </button>
        {gameMessage}
         <footer>
        <h4>Created by Ariana Spretz - Copyright 2024</h4>
</footer>
      </div>
     
    );
  },
  toggleDark () {
    this.setState ({ darkCell: !this.state.darkCell });
  },
  findCellType (requestObject) {
    let pointDist = Math.sqrt (
      Math.pow (requestObject.x - requestObject.playerInfo.coord.x, 2) +
      Math.pow (requestObject.y - requestObject.playerInfo.coord.y, 2)
    );

    let foundElement = requestObject.mapSettings.getElementAt (
      requestObject.x, requestObject.y
    );

    if ( pointDist > 2 + (0.5 * requestObject.playerInfo.level)
      && this.state.darkCell === true )
        return "gameDarkCell";

    if ( requestObject.playerInfo.coord.x == requestObject.x
      && requestObject.playerInfo.coord.y == requestObject.y )
      return "gameRoom gamePlayer";

    switch (foundElement.id) {
      case 'I': return "gameRoom gameEnter";
      case 'O': return "gameRoom gameExit";
      case 'L': return "gameRoom gameLifeKit";
      case 'E': return "gameRoom gameEnemy";
      case 'w': return "gameRoom " + foundElement.elem.type + "Weapon";
      case 'B': return "gameRoom gameBoss";
      case 'W': return "gameWall";
      case 'R': return "gameRoom";
      case 'C': return "gameCorridor";
    }

    return this.state.darkCell ? "gameDarkCell" : "gameWall";
  },
  centerView () {
    let playerInfo = this.props.store.getState ().playerInfo;

    let container = document.getElementsByClassName ('gameArea')[0];
    let player = document.getElementsByClassName ('gamePlayer')[0];

    container.scrollTop = player.offsetTop - 384;
    container.scrollLeft = player.offsetLeft - 480;
  },
  handleKeyPressed () {
    if ( this.state.inputLock === true )
         return;

    this.setState ({ inputLock: true });
    setTimeout (function () {
        this.setState ({ inputLock: false });
    }.bind (this), 100);

    let storeDispatch = this.props.store.dispatch;

    switch (window.event.keyCode) {
      case 38:
      case 87:
        storeDispatch ({
          type: 'MOVE',
          relCoord: { x: 0, y: -1 }
        });
        break;
      case 40:
      case 83:
        storeDispatch ({
          type: 'MOVE',
          relCoord: { x: 0, y: +1 }
        });
        break;
      case 37:
      case 65:
        storeDispatch ({
          type: 'MOVE',
          relCoord: { x: -1, y: 0 }
        });
        break;
      case 39:
      case 68:
        storeDispatch ({
          type: 'MOVE',
          relCoord: { x: +1, y: 0 }
        });
        break;
      default:
        console.log (window.event.keyCode);
        break;
    }

    this.centerView ();
  }
});

ReduxStore.subscribe (() => {
  ReactDOM.render (<ReactGameArea store={ReduxStore} />,
    document.getElementById ('container'));
});

ReduxStore.dispatch ({ type: 'INIT' });
