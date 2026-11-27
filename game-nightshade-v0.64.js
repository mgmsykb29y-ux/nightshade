'use strict';
// ====================================================== data
const D = PACK.data, A = PACK.assets;
const ING = D.ings, REC = D.recipes, COLS = D.cols;
const INGI = {}; ING.forEach((g, i) => { INGI[g.id] = i; g.taste = D.taste[g.id] || [0,0,0,0,0]; });
const METHODS = ['焼く','煮る','揚げる','蒸す','生','炊く','炒める','和える'];
const MSUF = {'焼く':'焼き','煮る':'煮込み','揚げる':'揚げ','蒸す':'蒸し','生':'和え','炊く':'炊き込み','炒める':'炒め','和える':'和え物'};
const RKEY = {}; REC.forEach((r, i) => { r.key = r.method + '|' + [...r.ings].sort().join(','); RKEY[r.key] = i;
  r.value = Math.round(r.ings.reduce((s, id) => s + ING[INGI[id]].value, 0) * 1.8 + 10); });
const FANTASY = new Set(['mandrake','nightshade','moonshroom','fairy_flower','manna']);
const TOOLS = D.tools, TOOLI = {}; TOOLS.forEach(t => TOOLI[t.id] = t);
const RARE_FISH = new Set(['misteel','abyssfish']);
const SEEDS = ING.filter(g => g.src[0] === 'seed');
const MARKET = ING.filter(g => g.src[0] === 'market');
const isItem = id => { const s0 = ING[INGI[id]].src[0]; return s0 === 'item' || s0 === 'ore'; };
const isOre = id => ING[INGI[id]].src[0] === 'ore';
const MACH = D.machines, MACHI = {}; MACH.forEach(m => MACHI[m.id] = m);
const PROC_OUT = new Set(MACH.flatMap(m => m.recipes.map(r => r.out)));
const POND = ING.filter(g => g.src[0] === 'pond'), PIER = ING.filter(g => g.src[0] === 'pier');
const CH = {}; D.chars.forEach((k, i) => CH[k] = i);
const CUST_KINDS = ['hood','knight','witch','beard','lizard','traveler'];
const SAVE_KEY = 'nk_save_v1';
const OFFLINE_CAP = 8 * 3600;

const FAC = {
  plots:  {name:'畑の区画', desc:'耕せる区画が3つ増える', max:7, start:1, cost:l => Math.round(150*Math.pow(1.8, l-1))},
  shelf:  {name:'陳列棚', desc:'同時に並べられる料理の種類が増える', max:4, start:1, cost:l => Math.round(300*Math.pow(2.2, l-1))},
  hearth: {name:'かまど', desc:'料理人の調理が速くなる', max:5, start:1, cost:l => Math.round(400*Math.pow(2, l-1))},
  sign:   {name:'看板と内装', desc:'客足が20%ずつ増える', max:5, start:0, cost:l => Math.round(350*Math.pow(1.9, l))},
  pond:   {gate:'fishing', name:'生簀', desc:'釣りが簡単になり、珍しい魚が増える。釣り人も速くなる', max:3, start:0, cost:l => Math.round(500*Math.pow(2, l))},
  bee:    {gate:'ranch', name:'養蜂箱', desc:'蜂蜜が自動で採れる', max:3, start:0, cost:l => Math.round(800*Math.pow(2, l))},
  greenhouse:{gate:'season', name:'温室', desc:'マンドラゴラ・夜光ナス・月光キノコの種が買えるようになる', max:1, start:0, cost:l => 2500},
  sprinkler:{gate:'season', name:'スプリンクラー', desc:'畑に自動で水をやる。Lv1＝4区画、Lv2＝12区画（成長1.5倍）、Lv3＝全区画（成長1.8倍）', max:3, start:0, cost:l => Math.round(500 * Math.pow(2.2, l))},
  compost:{gate:'quality', name:'たい肥箱', desc:'余った作物や創作料理から肥料を作る（農場の右下）', max:1, start:0, cost:l => 300},
  orchard:{gate:'ranch', name:'果樹園', desc:'農場の右下に果樹園を開く。苗木を植えると、育ったあとは何度でも実る', max:1, start:0, cost:l => 2500},
  coop:{gate:'ranch', name:'鶏小屋', desc:'ニワトリが卵を産む（Lv1＝2羽、Lv2＝4羽、Lv3＝6羽）。えさ箱に作物を入れておく', max:3, start:0, cost:l => [800, 1600, 3200][l]},
  barn:{gate:'ranch', name:'牛舎', desc:'牛が牛乳を出す（Lv1＝1頭、Lv2＝2頭、Lv3＝3頭）。えさ箱に作物を入れておく', max:3, start:0, cost:l => [1500, 3000, 6000][l]},
  workshop:{gate:'workshop', name:'加工工房', desc:'店の外の建設予定地に工房を建てる。燻製小屋と干し棚が置けるようになる', max:1, start:0, cost:l => 2000},
  kitchen:{grp:'ext', name:'厨房の拡張', desc:'料理の保管上限 +35／Lv。料理人がときどき2品同時に作る（25%／Lv）', max:5, start:0, req:{sold:20}, cost:l => [2500, 8000, 20000, 45000, 90000][l]},
  upstairs:{grp:'ext', name:'2階の客席', desc:'店内の階段から2階へ。席が増え、客足 +12%／Lv。買った客が追加でもう1品頼むことがある（12%／Lv）', max:5, start:0, req:{rank:1, fac:{kitchen:1}}, cost:l => [6000, 20000, 50000, 100000, 180000][l]},
  terrace:{grp:'ext', name:'テラス席', desc:'2階の外に夜景の見える席。旬の食材を使った料理の価値 +12%／Lv。雨や嵐でない日は客足 +8%／Lv', max:4, start:0, req:{rank:1, fac:{upstairs:1}}, cost:l => [8000, 24000, 60000, 120000][l]},
  bar:{grp:'ext', name:'酒場カウンター', desc:'夜（18時〜翌2時）に倉庫のワインや酒を売る。Lv2で売値+20%（Lv4で+35%）、夜の焼き料理・揚げ物の価値 +15%', max:4, start:0, req:{rank:2, fac:{upstairs:1}}, cost:l => [15000, 40000, 90000, 160000][l]},
  inn:{grp:'ext', name:'宿屋（客室）', desc:'2階に客室（1部屋／Lv、Lv4からは客室の格上げで宿泊料+25%／Lv）。夜に旅人が泊まり、翌朝は倉庫の料理で朝食。宿泊料・朝食代が入り、レシピの噂も聞ける', max:5, start:0, req:{rank:2, fac:{upstairs:2}}, cost:l => [20000, 45000, 90000, 160000, 280000][l]},
  courtyard:{grp:'ext', name:'中庭の席', desc:'店の裏の農場のはしに、畑を眺める中庭の席。客足 +6%／Lv。晴れた昼は、畑の作物を使った料理の価値 +10%／Lv', max:3, start:0, req:{rank:2, fac:{upstairs:1}}, cost:l => [12000, 32000, 75000][l]},
  cellar:{grp:'ext', gate:'cellar', name:'地下貯蔵庫', desc:'厨房の床扉から降りる石造りの地下室。食材を寝かせて品質★を上げ、熟成品（熟成肉・ヴィンテージワインなど）を作る。熟成台 6／10／16台', max:3, start:0, req:{fac:{upstairs:1}}, cost:l => [15000, 45000, 120000][l]},
  bath:{grp:'ext', name:'大浴場', desc:'2階の奥に大浴場。宿の泊まり客が増え（+12%／Lv）、宿泊料 +30%／Lv、朝食代 +10%／Lv', max:3, start:0, req:{rank:3, fac:{inn:2}}, cost:l => [30000, 70000, 150000][l]},
  lab:{gate:'breed', name:'交配台', desc:'農場の道具小屋で種を掛け合わせる（品種改良・新しい作物）。Lvで同時に交配できる数と速さが上がる', max:3, start:0, cost:l => [3000, 8000, 20000][l]},
  stall:{gate:'stall', name:'屋台', desc:'出張販売で持っていける品数+1・時間+10秒・お客の我慢強さ+15%', max:4, start:1, cost:l => [0, 0, 2000, 6000, 15000][l]},
  seedmaker:{gate:'quality', name:'種子づくり機', desc:'作物1個から種2個を作る（農場の道具小屋）', max:1, start:0, cost:l => 700},
};
const STAFF = {
  cook:   {name:'料理人', icon:'cook', desc:'覚えたレシピを自動で作り続ける（かまどLvで加速）', base:300, max:6},
  clerk:  {name:'店員', icon:'clerk', desc:'自動販売が使えるようになり、客足が増える', base:250, max:5},
  farmer: {name:'農夫', icon:'farmer', desc:'実った作物を収穫し、同じ種を植え直す', base:200, max:6},
  fisher: {name:'釣り人', icon:'fisher', desc:'生簀で魚を釣ってくる', base:400, max:4},
  brewer: {name:'仕込み師', icon:'brewer', desc:'加工器具で、決めておいた物を自動で仕込む（足りない市場の材料は1日の予算内で買う。加工器具を置くと雇える）', base:350, max:4},
  miner: {name:'採掘人', icon:'miner', desc:'行ったことのある階で鉱石を掘ってくる（地下迷宮に一度入ると雇える）', base:600, max:4},
};
const RESIDENTS = [
  {k:'witch', name:'魔女のミラ', lines:['夜光ナスは月の光で育つのよ。温室があれば、ね。','あなたのスープ、少し魔力の匂いがするわ。','裏の井戸の底から、ときどき歌が聞こえるの。']},
  {k:'beard', name:'鍛冶屋のガルド', lines:['腹が減っては槌も振れん！','宵闇亭の灯りが見えると、仕事終わりだと思える。','昔、地下迷宮で金色の茸を見たことがある。']},
  {k:'lizard', name:'旅商人シャズ', lines:['東の港じゃ、奈落魚ってのが釣れるらしいぜ。','いい値付けは客の顔に書いてある。よく見るこった。','金色の食材？　料理にすると三倍で売れるって噂だ。']},
  // v0.61 通りの住民を8人追加（hrs＝通りにいる時間［分］、gift＝親しさ3ごとにくれる物、gift2＝親しさ3で2余るときにくれる物）
  {k:'baker', name:'パン屋のおかみポーラ', hrs:[[360, 840]], gift:[['flour', 4], ['butter', 2]], gift2:[['bread', 3]], lines:['焼きたての匂いで、朝が来たってわかるのさ。','パン生地はね、急かすと機嫌を損ねるんだよ。','宵闇亭のスープにうちのパンを浸すと、たまらないって評判さ。']},
  {k:'florist', name:'花売りのリリ', hrs:[[480, 1020]], gift:[['strawberry', 3], ['mint', 4]], gift2:[['honey', 2]], lines:['お店のテーブルにお花はいかが？　気分が華やぐわ。','花畑の丘では、晴れた日に珍しい花が咲くの。','ミントを一枝、お茶に浮かべてみて。']},
  {k:'watch', name:'夜回りのボルツ', hrs:[[1140, 1440], [0, 240]], gift:[['coal', 3], ['beef', 2]], gift2:[['egg', 6]], lines:['夜の通りは任せとけ。宵闇亭の灯りは目印になる。','井戸のあたりで、ときどき妙な足音がするんだ。','腹が減るのは夜回りの職業病だな。']},
  {k:'bard', name:'吟遊詩人カノン', hrs:[[900, 1380]], gift:[['wine', 2], ['honey', 2]], gift2:[['chocolate', 2]], lines:['今夜の歌は、宵闇亭の名物料理の歌にしよう。','旅先で聞いた話だけど、雪の国の王様は大の甘党らしいよ。','いい料理といい歌は、どちらも余韻が大事なのさ。']},
  {k:'mail', name:'郵便屋ピップ', hrs:[[540, 720], [840, 960]], gift:[['apple', 2], ['milk', 4]], gift2:[['sugar', 5]], lines:['今日も配達だらけ！　町じゅうを走り回ってるよ。','宵闇亭あての手紙、最近ふえてるって知ってた？','港町から来た荷物は、いつも潮の匂いがするんだ。']},
  {k:'oldfisher', name:'老漁師トク', hrs:[[300, 540], [960, 1140]], gift:[['bait', 5], ['aji', 3]], gift2:[['iwashi', 4]], lines:['魚はな、朝と夕方に腹を空かせるもんだ。','霧の濃い日は、珍しいのが掛かりやすい。','若いの、釣り糸は張りすぎず緩めすぎず、だ。']},
  {k:'scholar', name:'学者のエルマー', hrs:[[600, 1080]], gift:[['tea', 4], ['coffee', 3]], gift2:'recipe', lines:['料理とは、つまるところ化学だよ。実に興味深い。','古い文献に、地下に眠る厨房の記述があってね……。','食材の旬を知れば、味は自然とついてくるものさ。']},
  {k:'dancer', name:'踊り子のサラ', hrs:[[1080, 1440]], gift:[['strawberry', 2], ['chocolate', 2]], gift2:[['wine', 1]], lines:['踊ったあとは、甘いものがいちばん！','夜の広場は、私の舞台なの。見に来てね。','あなたの料理、踊りたくなるくらいおいしいわ。']},
];
const resHere = r => !r.hrs || r.hrs.some(([a, b]) => hmNow() >= a && hmNow() < b);
const GOALS = [
  {t:'裏の農場で種を植えよう', h:'店内の左上の裏口から農場へ。空いた区画をタップ', chk:s => s.stat.planted > 0, r:50},
  {t:'作物を収穫しよう', h:'持ち物でジョウロを選んで作物をタップ＝水やり。実ったらタップで収穫', chk:s => s.stat.harvested > 0, r:50},
  {t:'かまどで料理を作ろう', h:'店内のかまどをタップ。食材と調理法を選ぶ', chk:s => s.stat.cooked > 0, r:80},
  {t:'料理を陳列棚に並べよう', h:'カウンターの棚かレジをタップして、値段を決める', chk:s => s.shelf.some(x => x.n > 0) || s.stat.sold > 0, r:80},
  {t:'料理を3つ売ろう', h:'客の表情で値段が高いか安いかわかる', chk:s => s.stat.sold >= 3, r:120, un:['orders']},
  {t:'依頼を1つ届けよう', h:'①店の外の掲示板で依頼を見る（料理の名前と材料のヒント）②その料理を作る ③棚に並べずに、できあがり画面か掲示板の「届ける」で渡す', chk:s => (s.stat.orders || 0) >= 1, r:150, un:['staff']},
  {t:'従業員を雇おう', h:'下の「従業員」から雇える。留守中も働いてくれる', chk:s => Object.values(s.staff).some(v => v > 0), r:150, un:['fishing']},
  {t:'釣りをしてみよう', h:'外の市場の「道具」で釣り竿を買い、農場の生簀か店の外の桟橋へ', chk:s => s.stat.fished > 0, r:100, un:['forage']},
  {t:'森と浜で採集しよう', h:'店の外の道を下へ。光っている物を拾う', chk:s => (s.stat.foraged || 0) >= 1, r:120, un:['season']},
  {t:'レシピを10種類見つけよう', h:'組み合わせと調理法を変えて試そう。市場の「本」も役立つ', chk:s => Object.keys(s.known.r).length >= 10, r:300, un:['quality', 'ach']},
  {t:'施設を強化しよう', h:'下の「施設」から', chk:s => ['plots','shelf','hearth','sign'].some(k => s.fac[k] > FAC[k].start), r:200, un:['merchant', 'ranch']},
  {t:'行商人から買い物しよう', h:'週に2回（火曜と土曜）の10時〜22時、広場の右下に行商人の荷馬車が来る', chk:s => (s.stat.merchant || 0) >= 1, r:200, un:['regulars']},
  {t:'鶏小屋か牛舎を建てよう', h:'「施設」から。えさ箱に作物を入れると卵や牛乳がとれる', chk:s => s.fac.coop > 0 || s.fac.barn > 0, r:300, un:['machines', 'breed']},
  {t:'加工器具を1つ設置しよう', h:'キッチンの器具置き場（左右の壁ぎわ）を調べる', chk:s => Object.values(s.mach || {}).some(m => m.lv > 0), r:300, un:['mine']},
  {t:'地下迷宮に入ってみよう', h:'店の外の古井戸から。ツルハシは市場の「道具」で買える', chk:s => s.mine && s.mine.max >= 1, r:150, un:['story']},
  {t:'地下迷宮のB5にたどり着こう', h:'店の外の古井戸から。ツルハシと剣は市場の「道具」', chk:s => s.mine && s.mine.max >= 5, r:500, un:['stall']},
  {t:'出張販売をしよう', h:'店の外の屋台から。1日1回、料理を持って広場で売る', chk:s => (s.stat.stall || 0) >= 1, r:400, un:['contest', 'workshop', 'duel']},
  {t:'地下迷宮のB10にたどり着こう', h:'5階ごとの昇降機を使うと早い。剣を鍛えておこう', chk:s => s.mine && s.mine.max >= 10, r:800, un:['monster']},
  {t:'魔物を30体倒そう', h:'地下迷宮の魔物を剣で倒す。倒した数は図鑑の「魔物」タブで見られる', chk:s => totalKills(s) >= 30, r:1000, un:['guild']},
  {t:'冒険者ギルドのランクをEにしよう', h:'ギルドの依頼でポイントをためて、受付で昇格試験（B4より深い階の試験官）', chk:s => s.guild && s.guild.rank >= 1, r:3000, un:['arms']},
  {t:'レシピを30種類見つけよう', h:'本・常連客・泊まり客の噂などでレシピは増える', chk:s => Object.keys(s.known.r).length >= 30, r:800, un:['critic', 'decor']},
  {t:'店の内装を1か所変えよう', h:'「施設」の「🛋 内装を変える」で、床・テーブル・照明・飾りのどれかを買う', chk:s => !!s.decor && Object.keys(s.decor.own || {}).length >= 1, r:600, un:['place'], v48:1},
  {t:'飾りを2つ置こう', h:'冒険者ギルドの受付の「🪑 飾りの交換所」で飾りを手に入れ、「施設」の「🪑 飾りを自由に置く」から好きな場所に置く', chk:s => !!s.plc && Object.values(s.plc.pl || {}).reduce((a, l) => a + l.length, 0) >= 2, r:1500, un:['medal'], v48:1},
  {t:'魔物料理を3皿売ろう', h:'魔物の素材を使った料理（「魔」の印）を棚に並べて売る', chk:s => (s.stat.monsold || 0) >= 3, r:900, un:['night']},
  {t:'加工工房を建てよう', h:'「施設」から。店の外の建設予定地に建つ', chk:s => s.fac.workshop > 0, r:500, un:['expand']},
  {t:'裏営業で深夜の客をもてなそう', h:'21時〜深夜2時、店内の画面上「🌙裏営業」から', chk:s => (s.stat.nightserved || 0) >= 1, r:1000, un:['town']},
  {t:'常連客と♥2まで仲良くなろう', h:'常連客は好みの味の料理を買うと親しくなる（図鑑「常連」）', chk:s => Object.values(s.reg || {}).some(r => r.lv >= 2), r:600, un:['airec']},
  {t:'試作台でオリジナル料理を作ろう', h:'かまどの「🧪試作台」。材料と調理法・仕上げを選んで味見し、「これで完成にする」', chk:s => (s.aiRecs || []).length >= 1, r:1200, un:['oorder'], v48:1},
  {t:'町に投資しよう', h:'店の外の広場にある「町の発展計画」の看板から', chk:s => Object.keys(s.town || {}).length >= 1, r:800},
  {t:'2階の客席を作ろう', h:'「施設」の「店の拡張」から', chk:s => (s.fac.upstairs || 0) > 0, r:1000, un:['cellar']},
  {t:'評論家に★4以上をもらおう', h:'品質の高い料理を、適正な値段で一番目立つ棚に', chk:s => (s.reviews || []).some(r => r.stars >= 4), r:1500},
  {t:'料理コンテストで優勝しよう', h:'毎週木〜日曜。テーマに合う、価値と品質の高い料理を', chk:s => (s.trophy || 0) >= 1, r:2000},
  {t:'宿屋を開こう', h:'「店の拡張」から。2階の客席Lv2が必要', chk:s => (s.fac.inn || 0) > 0, r:3000, un:['lottery']},
  {t:'福引きを引いてみよう', h:'広場の泉の左下にある、福引きの露店で', chk:s => (s.stat.fuku || 0) >= 1, r:1000, un:['dice']},
  {t:'魔族とのサイコロで1回勝とう', h:'裏営業のあいだ、店内の画面上「🎲サイコロ」から', chk:s => (s.stat.diceWin || 0) >= 1, r:1500, un:['auction']},
  {t:'行商人の競りで落札しよう', h:'掲示板か行商人の荷馬車の「🔨競り」で、週のいつでも入札を預けられる（土曜10時に自動で競る）。土曜10〜22時は荷馬車でその場で入札もできる', chk:s => (s.stat.auction || 0) >= 1, r:2000, un:['branch']},
  {t:'となり町に支店を出そう', h:'「施設」タブの「となり町の支店」から', chk:s => s.branch && s.branch.lv >= 1, r:5000, un:['trade']},
  {t:'食材の相場で利益を出そう', h:'市場の「相場」タブ。安い日に買って、高い日に売る', chk:s => (s.stat.tradeWin || 0) >= 1, r:3000, un:['training']},
  {t:'従業員を修行の旅に出そう', h:'Lv10の従業員を「従業員」タブから', chk:s => (s.stat.train || 0) >= 1, r:5000, un:['rival']},
  {t:'支店をLv3にしよう', h:'「施設」タブの「となり町の支店」から', chk:s => s.branch && s.branch.lv >= 3, r:20000, un:['abyss']},
  {t:'白昼亭との売上勝負に勝とう', h:'宵闇亭の右隣の白昼亭。毎週（月〜日曜）の「お題」（最初の週は売上）で、日曜が終わったときに多いほうが勝ち', chk:s => s.rival && s.rival.wins >= 1, r:10000},
  {t:'白昼亭に3回勝って提携しよう', h:'毎週お題が変わる（魚介の料理・甘い料理・皿数など）。白昼亭をタップしてお題を見て、合う料理を棚に並べよう', chk:s => s.rival && s.rival.ally, r:30000},
  {t:'店の格を「伝説の宵闇亭」にしよう', h:'評判85以上・料理を1,500皿以上売る', chk:s => rankIdx() >= 4, r:20000, un:['fame']},
  {t:'名声をLv5にしよう', h:'画面上の店の格のところをタップすると名声が見られる。売上と評判で貯まる', chk:s => s.fame && s.fame.lv >= 5, r:30000, un:['kiwami']},
  {t:'料理を1つ「極」にしよう', h:'同じ料理を150皿作る（料理人が作った分も入る）。図鑑の「極み」タブで進み具合', chk:s => kiwaCount() >= 1, r:30000, un:['tower']},
  {t:'決闘の塔で10階まで登ろう', h:'泉の料理決闘の画面から「決闘の塔へ」', chk:s => s.tower && s.tower.best >= 10, r:40000, un:['expedition']},
  {t:'港町シオカゼの評判をLv3にしよう', h:'屋台で料理を売る・交易所の「求む」に応える・食堂でレシピを教わる', chk:s => expLv('port') >= 3, r:50000, un:['desert']},
  {t:'砂の町サハランの評判をLv2にしよう', h:'屋台・交易所・食堂。夕方17時からの夜のバザールが稼ぎどき', chk:s => expLv('desert') >= 2, r:30000, un:['caravan']},
  {t:'冒険者ギルドのランクをCにしよう', h:'ギルドの依頼でポイントをためて、受付で昇格試験（D：B9より深い階、C：B15より深い階）', chk:s => s.guild && s.guild.rank >= 3, r:40000, un:['dungeon']},
  {t:'専用ダンジョンのボスを倒そう', h:'遠征先の町の馬車（遠征の地図）から「専用ダンジョン」へ。港町シオカゼの沈没船の最奥に大海魔クラーケン', chk:s => s.dg && s.dg.kills >= 1, r:50000, un:['curse']},
  {t:'魔物図鑑で★1の魔物を8種類にしよう', h:'同じ魔物を10体倒すと★1（図鑑の「魔物」タブ）', chk:s => Object.keys(MONT).filter(k => !MONT[k].boss && monStar(k) >= 1).length >= 8, r:50000, un:['mranch']},
  {t:'魔物牧場で魔物を3体育てよう', h:'★1以上の魔物は倒すとまれになつく。迷宮で拾った卵を孵化小屋で孵してもいい', chk:s => s.mr && s.mr.mons.length + s.mr.box.length >= 3, r:30000, un:['familiar']},
  {t:'使い魔をLv5に育てよう', h:'牧場の魔物を「使い魔にする」と、迷宮で一緒に戦って育つ', chk:s => s.mr && [...s.mr.mons, ...s.mr.box].some(m => m.lv >= 5), r:40000, un:['herb']},
  {t:'薬を5本調合しよう', h:'魔物牧場の薬草畑で薬草を育て、調合小屋で薬を作る', chk:s => s.mr && (s.mr.nPot || 0) >= 5, r:40000, un:['mbreed']},
  {t:'魔物牧場で魔物を6体育てよう', h:'牧場の魔物はなつかせたり、卵から孵したり、掛け合わせたりして増やせる', chk:s => s.mr && s.mr.mons.length + s.mr.box.length >= 6, r:50000, un:['museum'], v44:1},
  {t:'博物館に20点飾ろう', h:'店の外の道しるべから博物館へ。珍しい食材・魚・魔物の標本・武器や鉱石を寄贈すると飾られる', chk:s => s.mu && Object.keys(s.mu.d).length >= 20, r:80000, un:['restore'], v44:1},
  {t:'使い魔をLv15にして進化させよう', h:'使い魔は一緒に魔物を倒すと育つ。成長の薬でもLvが上がる', chk:s => s.mr && [...s.mr.mons, ...s.mr.box].some(m => m.lv >= 15), r:60000, un:['tmap'], v41:1},
  {t:'勲章を合わせて5段階にしよう', h:'料理・冒険・釣り・農業・商いの記録で勲章が授けられる（図鑑の「実績」タブ）。銅＝1段階、銀＝2段階……', chk:s => !!s.medal && Object.values(s.medal).reduce((a, b) => a + b, 0) >= 5, r:60000, un:['expd'], v48:1},
  {t:'宝の地図の宝を掘り当てよう', h:'釣り・魔物・採集でときどき地図を拾う。画面上の「🗺地図」で場所を確かめて、×印を掘る', chk:s => s.tmap && s.tmap.found >= 1, r:50000, un:['secret'], v41:1},
  {t:'迷宮の隠し部屋を見つけよう', h:'迷宮やダンジョンの階に、ひび割れた壁があることがある。タップすると崩れる', chk:s => (s.stat.vaults || 0) >= 1, r:50000, un:['moon'], v41:1},
  {t:'砂の町サハランの評判をLv3にしよう', h:'夕方17時からの「夜のバザール」で屋台を出すと、高く・たくさん売れる', chk:s => expLv('desert') >= 3, r:60000, un:['tea']},
  {t:'茶の里ミドリの評判をLv3にしよう', h:'毎日の「野点の茶会」で注文の料理を出すと、評判がぐっと上がる', chk:s => expLv('tea') >= 3, r:70000, un:['capital']},
  {t:'雪の王都シルヴァの評判をLv3にしよう', h:'「王宮への献上」は1日1皿。高い料理ほど褒美が大きい', chk:s => expLv('capital') >= 3, r:80000, un:['isle']},
  {t:'南の果実島ルルアの評判をLv3にしよう', h:'「島の果樹」で毎日果物を摘める。果物の料理が好まれる', chk:s => expLv('isle') >= 3, r:100000},
  {t:'満月の夜に月の兎の夜店で買い物しよう', h:'毎週木曜の19時〜朝5時、店の外の広場に夜店が出る（暦にも載る）', chk:s => (s.stat.moonbuy || 0) >= 1, r:60000, un:['stele'], v41:1},
  {t:'5つの町の石碑を調べて、封印の扉を開こう', h:'5つの町の広場にある古い石碑で紋を写し、地下迷宮B1の封印の扉へ', chk:s => s.stl && s.stl.open, r:150000, v41:1},
  {t:'冒険者ギルドのランクをAにしよう', h:'ギルドの掲示板の依頼をこなし、受付で昇格試験を受ける', chk:s => s.guild && s.guild.rank >= 5, r:120000},
  {t:'冒険者ギルドのランクをSにしよう', h:'Sの昇格試験はB40より深い階', chk:s => s.guild && s.guild.rank >= 6, r:200000, un:['comp'], v41:1},
  {t:'冒険の仲間を4人そろえよう', h:'ギルド前の広場に立っている冒険者に話しかけ、依頼をこなすと仲間になる', chk:s => s.cp && Object.keys(s.cp.j).length >= 4, r:300000, v41:1},
  {t:'旧市街の建物を3つ建て直そう', h:'博物館の館長から「王国の復興帳」。道しるべから旧市街へ行き、建物に食材・料理・お金を納める', chk:s => s.rs && Object.keys(s.rs.done).length >= 3, r:200000, v44:1},
  {t:'王国を復興し、5つの町の評判をLv3にしよう', h:'旧市街の8つの建物をすべて建て直し、5つの町すべてで評判Lv3にすると、王城の門の奥で何かがゆらぐ', chk:s => !!s.rs && RS_KEYS.every(k => s.rs.done[k]) && ['port', 'desert', 'tea', 'capital', 'isle'].every(t => expLv(t) >= 3), r:300000, un:['mirror'], v45:1},
  {t:'鏡の町ウラヤミの評判をLv3にしよう', h:'旧市街の王城の門から鏡の町へ。屋台・交易所・鏡の畑で評判が上がる', chk:s => expLv('mirror') >= 3, r:200000, v45:1},
  {t:'鏡の回廊の最奥で「鏡の店主」を倒そう', h:'うつしの姿見から鏡の回廊へ。全20階＋最奥の裏の厨房', chk:s => !!(s.dg && s.dg.kb && s.dg.kb.mirror > 0), r:500000, un:['noren'], v45:1},
];
const UNL = {
  orders:{n:'依頼の掲示板', i:'📜', d:'店の外の掲示板に、住民からの注文が貼られるようになった。', tut:'m_orders'},
  staff:{n:'従業員', i:'👥', d:'料理人・店員・農夫などを雇えるようになった。働くほどレベルが上がる。', tut:'m_staff'},
  fishing:{n:'釣り', i:'🎣', d:'市場で釣り竿・エサ・ルアーが買えるようになった。農場の生簀と店の外の桟橋で釣れる。', tut:'fish'},
  forage:{n:'採集の地図', i:'🗺', d:'店の外の広場の道から「採集の地図」をひらいて、森と浜へ行けるようになった。進み具合に合わせて、行ける場所が増えていく。', tut:'bio_map'},
  season:{n:'季節・天気・行事', i:'🌸', d:'季節と旬、毎日の天気、月の行事が始まった。', tut:'season'},
  quality:{n:'品質★', i:'★', d:'食材と料理に品質が付くようになった。', tut:'quality'},
  merchant:{n:'仕入れ商人', i:'🐴', d:'週に2回、行商人が珍しい品を持ってくるようになった。', tut:'merchant'},
  ranch:{n:'牧場と果樹園', i:'🐔', d:'鶏小屋・牛舎・養蜂箱・果樹園が建てられるようになった。', tut:'m_ranch'},
  regulars:{n:'常連客', i:'♥', d:'常連客が店に来るようになった。', tut:'regular'},
  machines:{n:'加工器具', i:'⚗', d:'キッチンに醸造樽などの加工器具を置けるようになった。', tut:'m_mach'},
  mine:{n:'地下迷宮', i:'⛏', d:'店の外の古井戸から地下迷宮に入れるようになった。', tut:'sc_mine'},
  stall:{n:'出張販売', i:'🏮', d:'店の外の屋台から、広場へ出張販売に行けるようになった。', tut:'stall'},
  contest:{n:'料理コンテスト', i:'🏆', d:'毎週木〜日曜に料理コンテストが開かれるようになった。', tut:'contest'},
  workshop:{n:'加工工房', i:'🏭', d:'店の外に加工工房を建てられるようになった。', tut:'fac_workshop'},
  airec:{n:'オリジナルレシピ（試作台）', i:'🧪', d:'かまどの試作台で、料理長と一緒にあなただけの料理を作れるようになった。', tut:'airec'},
  duel:{n:'料理決闘', i:'⚔', d:'広場の泉で、料理カードを使った勝ち抜きの料理決闘ができるようになった。', tut:'duel'},
  breed:{n:'品種改良（交配台）', i:'🧪', d:'「施設」で交配台を設置すると、農場の道具小屋で種を掛け合わせられるようになった。', tut:'breed'},
  decor:{n:'内装', i:'🛋', d:'「施設」から店の内装を変えられるようになった。', tut:'decor'},
  critic:{n:'料理評論家', i:'🧐', d:'料理評論家が店に来るようになった。', tut:'critic_soon'},
  tea:{n:'茶の里ミドリ', i:'🍵', d:'遠征の地図に3つ目の町「茶の里ミドリ」が加わった。茶と和菓子と川魚の山の里。', tut:'tea'},
  capital:{n:'雪の王都シルヴァ', i:'🏰', d:'遠征の地図に4つ目の町「雪の王都シルヴァ」が加わった。王宮に料理を献上できる。', tut:'capital'},
  isle:{n:'南の果実島ルルア', i:'🏝', d:'遠征の地図に5つ目の町「南の果実島ルルア」が加わった。船で渡る果物の島。', tut:'isle'},
  desert:{n:'砂の町サハラン', i:'🐪', d:'遠征の地図に2つ目の町「砂の町サハラン」が加わった。香辛料と菓子の町。夜はバザールでにぎわう。', tut:'desert'},
  expedition:{n:'遠征', i:'⚓', d:'採集の地図から「遠征の地図」を開けるようになった。馬車で遠くの町へ出かけ、その土地の食材とレシピを集めよう。', tut:'expedition'},
  tower:{n:'決闘の塔', i:'🗼', d:'町はずれの丘に、終わりのない決闘の塔が現れた。泉の料理決闘の画面から挑める。', tut:'tower'},
  abyss:{n:'奈落の深層', i:'🕳', d:'地下迷宮のB51から先が「奈落の深層」になった。どこまでも続き、深いほど魔物が強く、珍しい物が眠っている。', tut:'abyss'},
  fame:{n:'名声レベル', i:'🌟', d:'店の格「伝説」の先、上限のない名声レベルが始まった。売上と評判で貯まり、上がるほど料理の価値が上がる。', tut:'fame'},
  kiwami:{n:'料理の極み', i:'🔥', d:'熟練度★5の先、料理ごとの「極」を目指せるようになった。極めるほど価値が上がり、極めた数でごほうびがもらえる。', tut:'kiwami'},
  cellar:{n:'地下貯蔵庫', i:'🍷', d:'「施設」の「店の拡張」で地下貯蔵庫を建てられるようになった。食材を寝かせて品質を上げ、熟成品を作れる。', tut:'cellar'},
  rival:{n:'ライバル店「白昼亭」', i:'☀', d:'宵闇亭の右隣に、明るくて安い店「白昼亭」が建った。店主ヒナタと、毎週の売上で勝負する。', tut:'rival'},
  ach:{n:'実績と称号', i:'🏆', d:'料理の数・売上・釣り・迷宮などの記録を達成すると、ごほうびのお金と「称号」がもらえるようになった。', tut:'ach'},
  story:{n:'宵闇亭の秘密（日記）', i:'📔', d:'カウンターの奥から、先代の店主マルタの古い日記が出てきた。ページは町や迷宮のあちこちに散らばっているらしい。', tut:'diary'},
  tmap:{n:'宝の地図', i:'🗺', d:'釣り・魔物・採集で、ときどき宝の地図を拾うようになった。×印の場所を掘ると宝箱が出る。', tut:'tmap'},
  secret:{n:'迷宮の隠し部屋', i:'🧱', d:'迷宮やダンジョンの階に、ひび割れた壁が現れるようになった。崩すと昔の冒険者の隠し部屋がある。', tut:'secret'},
  moon:{n:'満月の夜', i:'🌕', d:'毎週木曜の夜は満月。広場に月の兎の夜店が出て、迷宮には月光スライムが現れ、魔物がなつきやすくなる。', tut:'moon'},
  stele:{n:'石碑と封印の扉', i:'🪨', d:'5つの町の広場に、古い石碑が見えるようになった。紋を集めると、地下迷宮B1の封印の扉が開く。', tut:'stele'},
  shugyo:{n:'霊峰の修練の塔・技・武器の成長', i:'🗼', d:'奈落の深層B60にたどり着き、古井戸の奥の転移の石から「霊峰の修練の塔」へ行けるようになった。武器の<b>技</b>（ゲージ）と<b>武器の成長・覚醒</b>、<b>銘の武器</b>（12系列）も始まる。', tut:'m_tower'},
  hill:{n:'丘の農地', i:'⛰', d:'裏の農場のいちばん下の道から、奥の「丘の農地」へ行けるようになった。土地を買うと、畑・果樹・特別な畑・動物が増やせる。', tut:'m_hill'},
  tavern:{n:'冒険者の酒場', i:'🍺', d:'ギルドの建物の中が酒場になった。カウンターで冒険者たちの注文を受けて料理を届けると、お金とギルドポイント。', tut:'m_tavern'},
  train:{n:'訓練所', i:'🗡', d:'酒場の奥の訓練所が開いた。武器の種類ごとに熟練度があり、使って倒すほど・稽古するほど、その種類の攻撃が上がる。', tut:'m_train'},
  appraise:{n:'鑑定屋', i:'🔮', d:'酒場の鑑定屋が開いた。これから拾う「希少」以上の武器は未鑑定で、鑑定すると効果が分かり、ときどき効果が1つ増える。', tut:'m_appraise'},
  arena:{n:'闘技場', i:'🏟', d:'酒場の奥の闘技場が開いた。魔物との勝ち抜き戦と、倒したボスの強化版との再戦。闘技場メダルで品物と交換できる。', tut:'m_arena'},
  museum:{n:'博物館', i:'🏛', d:'店の外の道しるべから「博物館」へ行けるようになった。集めた食材・魚・魔物・武器を飾ろう。図鑑の一番上に「完全攻略率」が出るようになった。', tut:'museum'},
  restore:{n:'王国の復興帳', i:'📜', d:'道しるべから「旧市街」へ行けるようになった。壊れた建物に食材や料理を納めて建て直すと、町の絵が変わり、よい効果が続く。', tut:'restore'},
  comp:{n:'冒険の仲間', i:'🤝', d:'ギルド前の広場に、腕の立つ冒険者が現れるようになった。依頼をこなすと仲間になって、迷宮に同行してくれる。', tut:'comp'},
  mranch:{n:'魔物牧場', i:'🐾', d:'店の外の道しるべから「魔物牧場と薬草園」へ行けるようになった。図鑑★1以上の魔物は倒すとまれになつき、迷宮で拾った卵は孵化小屋で孵せる。', tut:'mranch'},
  familiar:{n:'使い魔', i:'🐺', d:'牧場の魔物を1体「使い魔」にして、迷宮やダンジョンへ連れて行けるようになった。一緒に戦って育ち、Lv15とLv30で進化する。', tut:'familiar'},
  herb:{n:'薬草と調合', i:'🧪', d:'魔物牧場の薬草畑と調合小屋が使えるようになった。薬草を育てて30種類の薬を作れる。', tut:'herb'},
  mbreed:{n:'魔物の掛け合わせ', i:'💞', d:'魔物牧場の石舞台で、2体の魔物を掛け合わせられるようになった。新しい種類や色違いが生まれる。', tut:'mbreed'},
  dungeon:{n:'専用ダンジョン', i:'⚔', d:'遠征先の町ごとに、専用ダンジョン（全10階＋最奥のボス）に入れるようになった。町の馬車の「遠征の地図」から。市場の「道具」で回復薬も買えるようになった。', tut:'dungeon'},
  curse:{n:'呪いの迷宮', i:'🗿', d:'迷宮と専用ダンジョンの入口に「呪いの石像」が現れた。供え物をすると魔物が強くなるかわりに、落とし物と装備が増える。', tut:'curse'},
  caravan:{n:'交易キャラバン', i:'🐫', d:'遠征の地図から「交易キャラバン」を開ける。荷馬車が町と町を行き来して、荷を運んでもうける（留守中も）。伝説の食材も見つかることがある。', tut:'caravan'},
  arms:{n:'武器と装備', i:'⚔', d:'9種類×3型の武器が作れるようになった。迷宮で装備を拾い、指輪と首飾りもつけられる。鍛冶屋で付与、町とギルドで武器も買える。', tut:'arms'},
  guild:{n:'冒険者ギルド', i:'🛡', d:'店の外の広場の左に「冒険者通り」への道しるべが立った。ギルドで依頼を受け、ランクを上げよう。図鑑に「魔物」タブも加わった。', tut:'guild'},
  monster:{n:'魔物料理', i:'🦴', d:'迷宮の魔物が素材（肝・核・卵など）を落とすようになった。市場の本『魔物料理帖』も並ぶ。', tut:'monster'},
  night:{n:'裏営業（深夜の客）', i:'🌙', d:'21時〜深夜2時に、人ではない客をもてなす「裏営業」ができるようになった。', tut:'night'},
  town:{n:'町への投資', i:'🏘', d:'広場の看板「町の発展計画」から、お金を出して町を育てられるようになった。', tut:'town'},
  lottery:{n:'福引きと宝くじ', i:'🎊', d:'広場に福引きと週の宝くじの露店ができた。', tut:'lottery'},
  dice:{n:'魔族とのサイコロ', i:'🎲', d:'裏営業のあいだ、魔族の紳士とサイコロ勝負ができるようになった。', tut:'dice'},
  auction:{n:'行商人の競り', i:'🔨', d:'毎週土曜、行商人ドルンの荷馬車で珍品の競りが開かれるようになった。', tut:'auction'},
  branch:{n:'となり町の支店', i:'🏙', d:'となり町に支店「宵闇亭 二号店」を出せるようになった（施設タブ）。', tut:'branch'},
  trade:{n:'食材の相場', i:'📈', d:'市場に「相場」タブができた。高級食材を安く買って高く売れる。', tut:'trade'},
  training:{n:'修行の旅', i:'🧳', d:'Lv10の従業員を修行の旅に出して、奥義を身につけさせられるようになった。', tut:'training'},
  expand:{n:'店の拡張', i:'🔨', d:'厨房・2階の客席・テラス・酒場・宿屋へと店を広げられるようになった。', tut:'expand'},
};
const unl = k => !!(S.unl && S.unl[k]);
function gateMsg(k) { const u = UNL[k]; toast(`🔒 <b>${u.n}</b>はまだ使えない。<br>左上の目標を進めると解放される。`, 3000); return null; }
function unlockFeature(k, quiet) {
  if (!S.unl) S.unl = {}; if (S.unl[k]) return; S.unl[k] = 1; dirty = true;
  const u = UNL[k]; if (!u) return;
  if (!S.tut) S.tut = {}; const tk = u.tut, tx = TUT[tk];
  if (quiet) { if (tk) S.tut[tk] = 1; return; }
  if (tk) S.tut[tk] = 1;
  popStory(`<div class="tunl">🔓 新しい要素が解放された</div><div class="tth">${u.i} ${u.n}</div><div class="ttx">${u.d}${tx ? '<br><br>' + tx[1] : ''}</div>`);
  sfx('ok'); if (typeof chips === 'function') chips();
}


// ====================================================== state
function fresh() {
  const s = {
    v:1, gv:11, nbv:2, gold:600, rep:20, t:8*60, last:Date.now(),
    inv:{egg:4, rice:4, salt:4, oil:2, aji:2, tomato:2, onion:2}, invG:{}, seeds:{},
    dish:{}, dishG:{}, creative:{},
    known:{i:{}, r:{}}, menu:{},
    plots:[], shelf:[], fac:{}, staff:{cook:0, clerk:0, farmer:0, fisher:0, miner:0, brewer:0},
    auto:{sell:false, mode:'normal', buy:true},
    nb:{}, orders:[], ordersT:0, friend:{}, friendDay:{}, gardenT:-999,
    tm:{cook:[], farmer:[], fisher:0, brew:0, bee:0, cust:6, brewAlt:0, egg:60, milk:90},
    stat:{planted:0, harvested:0, cooked:0, sold:0, earned:0, fished:0}, goal:0,
    pos:{scene:'interior', x:86, y:160}, tools:{}, toolInv:[{uid:1, id:'can1', dur:40}], uidN:1, sel:1, ui:{pad:true, bgm:true, se:true},
    bag:[null, {k:'t', uid:1}, {k:'s', id:'tomato', n:4}, {k:'s', id:'cabbage', n:2}, {k:'s', id:'potato', n:2}, {k:'s', id:'carrot', n:2}, null, null, ...Array(16).fill(null)],
    mach:{}, trees:Array(16).fill(null), hill:{lv:0, sp:{}, an:{}}, traps:{pond:{n:0, t:240}, beach:{n:0, t:240}}, trapItems:0, tackle:{}, fishRec:{}, tkSel:'', forage:[], forageT:30, weather:null, luck3T:0, feed:0, aff:{chicken:0, cow:0}, petDay:{}, learned:{}, books:{}, near:{}, mast:{}, trend:null, resv:null, resvT:900, luckT:0, catDay:{}, rankSeen:0,
  };
  for (const k in FAC) s.fac[k] = FAC[k].start;
  for (let i = 0; i < 48; i++) s.plots.push({seed:null, t0:0, last:null});
  for (const k of Object.keys(s.inv)) s.known.i[k] = true;
  for (const n of D.starter) { const i = REC.findIndex(r => r.name === n); if (i >= 0) s.learned[i] = true; }
  return s;
}
let S = fresh();
function fixState() {
  if (!S.nbv) { S.nb = {}; S.nbv = 2; }   // v0.52.3：客の種類で食い違っていた値段の記録をやり直す
  if (S.title === '灯守') S.title = '宵闇亭の二代目';
  if (S.unl && S.unl.quality && !S.unl.ach) S.unl.ach = 1;
  if (S.duelS && S.duelS.runs > 0 && S.duelS.lesson === undefined) S.duelS.lesson = 1;
  { const ge = GOALS.findIndex(g => (g.un || []).includes('expedition')); if (S.unl && !S.unl.expedition && ge >= 0 && (S.goal || 0) > ge) S.unl.expedition = 1; }
  for (const tk of ['desert', 'tea', 'capital', 'isle']) { const ge = GOALS.findIndex(g => (g.un || []).includes(tk)); if (S.unl && !S.unl[tk] && ge >= 0 && (S.goal || 0) > ge) S.unl[tk] = 1; }
  { const ga = GOALS.findIndex(g => (g.un || []).includes('abyss')); if (S.unl && !S.unl.abyss && ga >= 0 && (S.goal || 0) > ga) S.unl.abyss = 1; }
  { const gc = GOALS.findIndex(g => (g.un || []).includes('cellar')); if (S.unl && !S.unl.cellar && gc >= 0 && (S.goal || 0) > gc) S.unl.cellar = 1; }
  { const gi = GOALS.findIndex(g => (g.un || []).includes('rival')); if (S.unl && !S.unl.rival && gi >= 0 && (S.goal || 0) > gi) S.unl.rival = 1; }
  if (S.gv === undefined) { if (S.goal) { const g = S.goal; S.goal = g + [13, 15, 16, 17, 18].filter(k => k < g).length; } S.gv = 2; }
  if (S.gv === 2) { const gi = GOALS.findIndex(g => (g.un || []).includes('guild')); if (S.unl && S.goal >= gi && gi >= 0) S.goal++; S.gv = 3; }
  if (S.gv === 3) { const gi = GOALS.findIndex(g => (g.un || []).includes('arms')); if (S.unl && S.goal >= gi && gi >= 0) S.goal++; S.gv = 4; }
  if (S.gv === 4) { const gi = GOALS.findIndex(g => (g.un || []).includes('caravan')); if (S.unl && S.goal >= gi && gi >= 0) S.goal++; S.gv = 5; }
  if (S.gv === 5) { const gi = GOALS.findIndex(g => (g.un || []).includes('dungeon')); if (S.unl && S.goal >= gi && gi >= 0) S.goal += 2; S.gv = 6; }
  if (S.gv === 6) { const gi = GOALS.findIndex(g => (g.un || []).includes('mranch')); if (S.unl && S.goal >= gi && gi >= 0) S.goal += 4; S.gv = 7; }
  if (S.gv === 7) { const G7 = GOALS.filter(g => !g.v44 && !g.v48); for (const i of G7.map((g, i) => g.v41 ? i : -1).filter(i => i >= 0)) if (S.unl && S.goal >= i) S.goal++; S.gv = 8; }
  if (S.gv === 8) { const G8 = GOALS.filter(g => !g.v45 && !g.v48); for (const i of G8.map((g, i) => g.v44 ? i : -1).filter(i => i >= 0)) if (S.unl && S.goal >= i) S.goal++; S.gv = 9; }
  if (S.gv === 9) { const G9 = GOALS.filter(g => !g.v48); for (const i of G9.map((g, i) => g.v45 ? i : -1).filter(i => i >= 0)) if (S.unl && S.goal >= i) S.goal++; S.gv = 10; }
  if (S.gv === 10) { for (const i of GOALS.map((g, i) => g.v48 ? i : -1).filter(i => i >= 0)) if (S.unl && S.goal >= i) S.goal++; S.gv = 11; }
  migrateSwords();
  if (S.unl === undefined) { S.unl = {}; const c = S.goal || 0, map = [0,1,2,3,4,5,7,9,10,11,11,11,13,13][Math.min(13, c)];
    let i = 0; while (i < GOALS.length && (i < map || GOALS[i].chk(S))) { (GOALS[i].un || []).forEach(k => S.unl[k] = 1); i++; } S.goal = i;
    const ev = {fishing:S.stat.fished > 0, mine:S.mine && S.mine.max > 0, machines:Object.values(S.mach || {}).some(m => m.lv), ranch:S.fac.coop || S.fac.barn || S.fac.orchard, workshop:S.fac.workshop, expand:Object.keys(FAC).some(k => FAC[k].grp === 'ext' && S.fac[k]), regulars:Object.values(S.reg || {}).some(r => r.aff), critic:(S.reviews || []).length, decor:(S.reviews || []).length || Object.keys(S.known.r).length >= 30, contest:S.contest && S.contest.done, season:S.qual || S.seasonSeen !== undefined, quality:S.qual, forage:S.stat.fished > 0, orders:S.stat.sold > 3, staff:Object.values(S.staff).some(v => v)};
    for (const k in ev) if (ev[k]) S.unl[k] = 1; }
  for (let i = 0; i < Math.min(S.goal || 0, GOALS.length); i++) (GOALS[i].un || []).forEach(k => { S.unl[k] = 1; });
  if (S.tut === undefined) { S.tut = {}; for (const k in TUT) if (!NEW_TUT.includes(k)) S.tut[k] = 1; }
  const f = fresh();
  for (const k in f) if (S[k] === undefined) S[k] = f[k];
  for (const k in f.fac) if (S.fac[k] === undefined) S.fac[k] = f.fac[k];
  for (const k in f.stat) if (S.stat[k] === undefined) S.stat[k] = f.stat[k];
  for (const k in f.tm) if (S.tm[k] === undefined) S.tm[k] = f.tm[k];
  while (S.plots.length < 48) S.plots.push({seed:null, t0:0, last:null});
  for (const p of S.plots) if (p.seed && p.g === undefined) { p.g = S.t - p.t0; p.w = 0; }
  if (!S.ui) S.ui = {pad:true};
  if (!S.toolInv) { S.toolInv = []; S.uidN = 0; for (const id in (S.tools || {can1:true})) { S.uidN++; S.toolInv.push({uid:S.uidN, id, dur:TOOL_DUR[id]}); } }
  if (S.sel === undefined) S.sel = 0;
  if (!S.bag) { S.bag = Array(BAG_N).fill(null); (S.hot || []).forEach((h, i) => { if (!h || i >= 8) return; if (h.t === 'tool') S.bag[i] = {k:'t', uid:h.uid}; else if (h.t === 'seed' && S.seeds[h.id]) { S.bag[i] = {k:'s', id:h.id, n:S.seeds[h.id]}; delete S.seeds[h.id]; } }); delete S.hot; }
  for (const k of ['learned','books','near','mast','catDay','mach','petDay']) if (!S[k]) S[k] = {};
  if (!S.trees) S.trees = [null,null,null,null]; while (S.trees.length < 16) S.trees.push(null); if (!S.hill) S.hill = {lv:0, sp:{}, an:{}}; if (!S.traps) S.traps = {pond:{n:0, t:240}, beach:{n:0, t:240}}; if (S.trapItems === undefined) S.trapItems = 0; if (!S.tackle) S.tackle = {}; if (!S.fishRec) S.fishRec = {}; if (S.tkSel === undefined) S.tkSel = '';
  if (!S.forage) S.forage = []; S.forage = S.forage.filter(f => f.v === 2); if (S.forageT === undefined) S.forageT = 30; if (!S.luck3T) S.luck3T = 0;
  if (S.fac.brew && !(S.mach.brew && S.mach.brew.lv)) S.mach.brew = {lv:S.fac.brew, q:[]};
  if (!S.aff) S.aff = {chicken:0, cow:0}; if (S.feed === undefined) S.feed = 0; if (S.tm.egg === undefined) { S.tm.egg = 60; S.tm.milk = 90; }
  if (!S.learned || !Object.keys(S.learned).length) for (const n of D.starter) { const i = REC.findIndex(r => r.name === n); if (i >= 0) S.learned[i] = true; }
  if (S.ui.bgm === undefined) { S.ui.bgm = true; S.ui.se = true; }
  if (S.resvT === undefined) S.resvT = 900;
  for (const k of ['cook','clerk','farmer','fisher','miner','brewer']) if (S.staff[k] === undefined) S.staff[k] = 0;
  for (const n of D.starter) { const i = REC.findIndex(r => r.name === n); if (i >= 0 && !S.known.r[i]) S.learned[i] = true; }
  syncShelf();
}
function syncShelf() { const n = 1 + S.fac.shelf; while (S.shelf.length < n) S.shelf.push({key:null, g:false, n:0, price:0}); }
const plotCount = () => Math.min(24, 3 + S.fac.plots * 3);
// v0.59 丘の農地：区画24〜47（1区8つずつ）、果樹4〜15
const hillLv = () => (S.hill && S.hill.lv) || 0;
const plotOn = i => i < 24 ? i < plotCount() : i < 24 + hillLv() * 8;
const PIDX = () => { const a = []; for (let i = 0; i < plotCount(); i++) a.push(i); for (let i = 24; i < 24 + hillLv() * 8; i++) a.push(i); return a; };
const plotScene = i => i < 24 ? 'farm' : 'hill';
const scenePlots = sc => PIDX().filter(i => plotScene(i) === sc);
const plotGrp = i => { if (i < 24) { const fx = i < 12 ? 0 : 12; return {fx, size:12}; } return {fx:24 + Math.floor((i - 24) / 8) * 8, size:8}; };
const treeOn = i => i < 4 ? !!S.fac.orchard : i < 4 + hillLv() * 4;
const shelfCount = () => 1 + S.fac.shelf;
let dirty = true;

// ====================================================== helpers
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const fmt = n => Math.floor(n).toLocaleString('ja-JP');
const ingName = id => ING[INGI[id]].name;
function add(o, k, n = 1) { if (curQ != null && n > 0 && o === S.inv) blendQ(k, n, curQ); o[k] = (o[k] || 0) + n; if (o[k] <= 0) delete o[k]; dirty = true; }
function wpick(list) { const tot = list.reduce((s, x) => s + x.w, 0); let r = Math.random() * tot; for (const x of list) { r -= x.w; if (r <= 0) return x; } return list[0]; }
function dishInfo(key) {
  if (key[0] === 'r') { const r = REC[+key.slice(1)]; return {name:r.name, value:r.value, icon:r.icon, ings:r.ings, method:r.method}; }
  const c = S.creative[key]; return c ? {name:c.name, value:c.value, icon:D.vessel[c.method], over:INGI[c.ings[0]], ings:c.ings, method:c.method} : {name:'?', value:1, icon:0, ings:[], method:'焼く'};
}
const MAST_T = [0, 5, 15, 30, 60];
const mastLv = key => { const n = S.mast[key] || 0; let l = 1; MAST_T.forEach((t, i) => { if (n >= t) l = i + 1; }); return l; };
const mastStars = key => `<span style="color:#e8b858;font-size:.85em">${'★'.repeat(mastLv(key))}</span>${typeof kiwaLv === 'function' && kiwaLv(key) ? `<span style="color:#ff9a4a;font-size:.85em">「${kiwaName(kiwaLv(key))}」</span>` : ''}`;
var ULT_KEYS = null;
const dval = (key, g) => Math.round(dishInfo(key).value * (g ? 3 : 1) * (1 + .08 * (mastLv(key) - 1)) * qMul(key) * (g && perkOn('cecil') ? 1.1 : 1) * (typeof kiwaMul === 'function' ? kiwaMul(key) * fameMul() : 1) * (typeof accMul === 'function' && S.gear ? accMul('shop') : 1) * (ULT_KEYS && ULT_KEYS.has(key) ? 3 : 1) * (S.ult && S.ult.perm.shop ? 1 + S.ult.perm.shop : 1) * (typeof medalMul === 'function' ? medalMul('cook') : 1));
// ----- taste
const MTASTE = {'焼く':[0,0,0,1,1],'煮る':[0,0,0,0,1],'揚げる':[0,0,0,0,2],'蒸す':[1,0,0,0,0],'生':[0,0,1,0,0],'炊く':[1,0,0,0,0],'炒める':[0,1,0,0,1],'和える':[0,0,1,0,1]};
function dishTaste(key) { const d = dishInfo(key), t = [...(MTASTE[d.method] || [0,0,0,0,0])]; d.ings.forEach(id => ING[INGI[id]].taste.forEach((v, i) => t[i] += v)); return t.map(v => Math.min(5, Math.round(v * .8))); }
const TNAME = ['甘','辛','酸','苦','旨'];
function tasteHTML(t) { return `<span class="taste">${t.map((v, i) => `<span>${TNAME[i]}<b style="color:#e8b858;letter-spacing:-1px">${'■'.repeat(v)}</b><b style="color:#4a3a30;letter-spacing:-1px">${'■'.repeat(5 - v)}</b></span>`).join('')}</span>`; }
// ----- calendar / events / trend / rank / luck
const MONTHS = ['睦月','如月','弥生','卯月','皐月','水無月','文月','葉月','長月','神無月','霜月','師走'];
const EVENTS = [
  {key:'newyear', n:'新年の祝い', d:'評判の上がり方が2倍'}, {key:'sweet', n:'甘味の月', d:'甘い料理が流行る'},
  {key:'spring', n:'春の芽吹き', d:'作物の成長が1.3倍'}, {key:'hanami', n:'花見弁当', d:'生もの・ご飯ものが流行る'},
  {key:'fishing', n:'釣り大会', d:'釣れる魚が2倍'}, {key:'rain', n:'長雨', d:'畑に水やり不要（自動で水やり済みになる）'},
  {key:'summer', n:'夏祭り', d:'揚げ物が流行り、客も1.3倍'}, {key:'spicy', n:'激辛祭り', d:'辛い料理が流行る'},
  {key:'harvest', n:'収穫祭', d:'収穫量+1'}, {key:'magic', n:'魔の月', d:'金色の食材が出る確率2倍'},
  {key:'fog', n:'霧の夜市', d:'幻の魚が掛かりやすく、魔族の客が訪れる'}, {key:'solstice', n:'冬至の宴', d:'煮込み料理が流行る'},
];
const gday = () => Math.floor(S.t / 1440);
const DIMS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], WDN = ['月', '火', '水', '木', '金', '土', '日'];
function ymd(d) { const a = 304 + d; let r = ((a % 365) + 365) % 365, m = 0; while (r >= DIMS[m]) { r -= DIMS[m]; m++; } return {y:Math.floor(a / 365), m, dd:r + 1}; }
const wdOf = d => ((d % 7) + 7) % 7 + 1; // 1=月曜 … 7=日曜（1週間＝7日。以前の「7日で1か月」と同じ周期）
const weekDay = () => wdOf(gday());
const monthIdx = () => ymd(gday()).m;
const monthName = () => MONTHS[monthIdx()];
const dayInMonth = () => ymd(gday()).dd;
const curEvent = () => weekDay() >= 5 && unl('season') ? EVENTS[monthIdx()] : null;
const evOn = k => { const e = curEvent(); return !!e && e.key === k; };
const luckMul = () => (S.luckT > S.t ? 2 : 1) * (S.luck3T > S.t ? 3 : 1) * (evOn('magic') ? 2 : 1);
const MLABEL = {'焼く':'焼き料理','煮る':'煮込み料理','揚げる':'揚げ物','蒸す':'蒸し料理','生':'生もの','炊く':'ご飯もの','炒める':'炒め物','和える':'和え物'};
const TLABEL = ['甘い料理','辛い料理','酸っぱい料理','ほろ苦い料理','旨みの強い料理'];
function ensureTrend() { if (!S.trend || S.trend.day !== gday()) { S.trend = Math.random() < .5 ? {day:gday(), kind:'t', v:Math.floor(Math.random() * 5)} : {day:gday(), kind:'m', v:pick(METHODS)}; } }
const trendText = () => S.trend ? '流行：' + (S.trend.kind === 't' ? TLABEL[S.trend.v] : MLABEL[S.trend.v]) : '';
function demandMatch(key) {
  const d = dishInfo(key), t = dishTaste(key);
  if (S.trend && (S.trend.kind === 't' ? t[S.trend.v] >= 3 : d.method === S.trend.v)) return true;
  const e = curEvent(); if (!e) return false;
  return (e.key === 'sweet' && t[0] >= 3) || (e.key === 'spicy' && t[1] >= 3) || (e.key === 'summer' && d.method === '揚げる') || (e.key === 'solstice' && d.method === '煮る') || (e.key === 'hanami' && (d.method === '生' || d.method === '炊く'));
}
const RANKS = [{n:'屋台級', rep:0, sold:0}, {n:'町の食堂', rep:25, sold:30}, {n:'評判の店', rep:45, sold:150}, {n:'名店', rep:65, sold:500}, {n:'伝説の宵闇亭', rep:85, sold:1500}];
const rankIdx = () => { let r = 0; RANKS.forEach((k, i) => { if (S.rep >= k.rep && S.stat.sold >= k.sold) r = i; }); return Math.max(r, 0); };
const CUSTT = {traveler:{b:.95, r:0}, beard:{b:1, r:0}, hood:{b:1, r:0}, knight:{b:1.1, r:1}, lizard:{b:1.05, r:1}, witch:{b:1.15, r:2}, noble:{b:1.35, r:3}, demon:{b:1.5, r:4}};
function pickCustomer() { const rk = rankIdx(), fog = evOn('fog'); const list = Object.keys(CUSTT).filter(k => CUSTT[k].r <= rk || (fog && (k === 'demon' || k === 'witch'))).map(k => ({k, w: (k === 'demon' && fog ? 3 : 1 + CUSTT[k].r * .3) * decorKindMul(k)})); return wpick(list).k; }
const WEATHERS = [{k:'sun', n:'晴れ', i:'☀', w:55}, {k:'rain', n:'雨', i:'☂', w:25, d:'畑は水やり不要'}, {k:'fog', n:'霧', i:'🌫', w:14, d:'珍しい魚が掛かりやすい'}, {k:'storm', n:'嵐', i:'⚡', w:6, d:'客が減るが、かご罠の獲物が倍'}];
function ensureWeather() { if (!unl('season')) { S.weather = {day:gday(), k:'sun'}; return; } if (!S.weather || S.weather.day !== gday()) { const w = wpick(WEATHERS.map(x => ({...x}))); S.weather = {day:gday(), k:w.k}; } }
const wx = () => WEATHERS.find(w => w.k === (S.weather || {}).k) || WEATHERS[0];
const wxOn = k => S.weather && S.weather.k === k;
const repGain = v => v > 0 && evOn('newyear') ? v * 2 : v;
const repDim = () => Math.max(.03, Math.pow(1 - S.rep / 100, 2));
function dishTotal() { let n = 0; for (const k in S.dish) n += S.dish[k]; for (const k in S.dishG) n += S.dishG[k]; return n; }

// ====================================================== images
const IMG = {};
// v0.46: 画像は blob: のURLで持つ（data:のURLを画面に何度も書きこむと、端末のメモリを大きく使って落ちることがあるため）
const BLOBU = {};
function b64Blob(src) { try { const bin = atob(src), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([u], {type:'image/png'})); } catch (e) { return 'data:image/png;base64,' + src; } }
function loadImg(k, src) { return new Promise(r => { if (!src) { BOOTERR.push('画像がない：' + k); return r(); } let done = false; const ok = () => { if (!done) { done = true; r(); } }; const i = new Image(); i.onload = () => { IMG[k] = i; ok(); }; i.onerror = () => { if (i.src.startsWith('data:')) { BOOTERR.push('画像を読めない：' + k); return ok(); } i.src = 'data:image/png;base64,' + src; }; setTimeout(() => { if (!done) BOOTERR.push('画像の読み込みが遅い：' + k); ok(); }, 20000); try { BLOBU[k] = b64Blob(src); i.src = BLOBU[k]; } catch (e) { i.src = 'data:image/png;base64,' + src; } }); }
const BOOTERR = [];
const introMsg = t => { const e = document.querySelector('#intro .ts'); if (e) e.innerHTML = t; };
// v0.57.2：起動の段階を記録し、止まったら知らせる（前回どこで止まったかも分かる）
let bootStage = '', bootT = Date.now(), bootDone = false;
const bootPrev = (() => { try { return JSON.parse(localStorage.getItem('nk_boot') || 'null'); } catch (e) { return null; } })();
function bootMark(st) { bootStage = st; bootT = Date.now(); try { localStorage.setItem('nk_boot', JSON.stringify({st, t:Date.now(), done:st === 'done'})); } catch (e) {} }
async function rescueCode() {
  let js = null; for (const k of [SAVE_KEY, ...BAK_KEYS]) { try { js = localStorage.getItem(k); } catch (e) {} if (js) break; }
  if (!js) return null;
  if (window.CompressionStream) { const cs = new Blob([js]).stream().pipeThrough(new CompressionStream('deflate')); const buf = new Uint8Array(await new Response(cs).arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192)); return 'NK1:' + btoa(bin); }
  return 'NK0:' + btoa(unescape(encodeURIComponent(js)));
}
function bootStuck(why) {
  const e = document.querySelector('#intro .ts'); if (!e || bootDone) return;
  e.innerHTML = `<span style="color:#e8a070">${why}（段階：${bootStage}）</span><br><span style="font-size:.85em">セーブは消えていません。</span><br>
    <span class="btn" id="bs_rl" style="display:inline-block;margin:.5em .3em;padding:.4em .8em">読み込み直す</span><span class="btn" id="bs_cp" style="display:inline-block;margin:.5em .3em;padding:.4em .8em">引き継ぎコードをコピー</span>`;
  const rl = document.getElementById('bs_rl'), cp = document.getElementById('bs_cp');
  if (rl) rl.onclick = ev => { ev.stopPropagation(); location.reload(); };
  if (cp) cp.onclick = async ev => { ev.stopPropagation(); try { const c = await rescueCode(); if (!c) return alert('セーブが見つからない'); await navigator.clipboard.writeText(c); cp.textContent = 'コピーした（' + c.length + '文字）'; } catch (er) { prompt('このコードを長押しでコピー', await rescueCode()); } };
}
setInterval(() => { if (!bootDone && Date.now() - bootT > 25000) bootStuck('読み込みが止まっているかもしれません'); }, 5000);
function iconStyle(idx, px, kind = 'atlas') {
  const sc = px / 32, x = (idx % COLS) * 32 * sc, y = Math.floor(idx / COLS) * 32 * sc;
  return `width:${px}px;height:${px}px;background-image:url(${URL_[kind]});background-size:${IMG.atlas.width * sc}px ${IMG.atlas.height * sc}px;background-position:-${x}px -${y}px`;
}
const URL_ = {};
function icHTML(idx, px, kind = 'atlas', overIdx = null, tip = null) {
  let h = `<div class="ic" ${tip ? `data-tip="${tip}"` : ''} style="${iconStyle(idx, px, kind)};position:relative">`;
  if (overIdx != null) h += `<div class="ic" style="${iconStyle(overIdx, px * .55, kind)};position:absolute;left:${px * .22}px;top:${px * .1}px"></div>`;
  return h + '</div>';
}
function dishIcHTML(key, px, g = false, kind = null) {
  const d = dishInfo(key); return icHTML(d.icon, px, kind || (g ? 'gold' : 'atlas'), d.over != null ? d.over : null, 'd:' + key + (g ? '*' : ''));
}
const isKnown = id => !!S.known.i[id];
const ingLabel = id => isKnown(id) ? ingName(id) : '？？？';
function ingIc(id, px, g = false, forceShow = false) { return icHTML(ING[INGI[id]].icon, px, g ? 'gold' : (isKnown(id) || forceShow ? 'atlas' : 'sil'), null, 'i:' + id); }
function tipText(t) {
  const [k, v] = [t.slice(0, 1), t.slice(2)];
  if (k === 'i') { const g = ING[INGI[v]]; if (!isKnown(v)) return ingObtainable(v) ? `<b>${g.name}</b><br>${srcText(g)}<br><span style="color:var(--sub)">まだ手に入れていない食材</span>` : `<b>？？？</b><br><span style="color:var(--sub)">話が進むと手に入る食材</span>`;
    return `<b>${g.name}</b>　価値 ${g.value}G<br>${g.desc}<br>${qHTML(qOf(v))}　${seasonText(v)}<br><span style="color:var(--sub)">${srcText(g)}　所持 ${haveIng(v)}${haveIng(v, true) ? '（金 ' + haveIng(v, true) + '）' : ''}</span><br>${tasteHTML(ING[INGI[v]].taste)}${typeof itemUses === 'function' ? itemUses(v) : ''}`; }
  if (k === 'd') { const g = v.endsWith('*'), key = g ? v.slice(0, -1) : v, d = dishInfo(key);
    return `<b>${g ? '金色の' : ''}${d.name}</b>${monTag(key)} ${mastStars(key)}　価値 ${fmt(dval(key, g))}G<br>${d.method}：${d.ings.map(ingLabel).join('・')}${key[0] === 'c' ? (S.creative[key] && S.creative[key].ai ? `<br><span style="color:#8ad0c8">✨オリジナル（${S.creative[key].score}点）${S.creative[key].desc || ''}</span>` : '<br><span style="color:var(--sub)">創作料理</span>') : ''}<br>${qHTML(dqOf(key))}<br>${tasteHTML(dishTaste(key))}`; }
  if (k === 'r') { const r = REC[+v]; return S.known.r[v] || S.learned[v] ? `<b>${r.name}</b>　${fmt(r.value)}G<br>${r.method}：${r.ings.map(ingLabel).join('・')}` : recMakeable(+v) && !SECRET_R.has(+v) ? `<b>${r.name}</b>　<span style="color:var(--sub)">まだ作ったことがない</span><br>調理法「${r.method}」・食材${r.ings.length}品` : `<b>？？？</b><br>調理法「${r.method}」・食材${r.ings.length}品<br><span style="color:var(--sub)">話が進むと手に入る食材を使うらしい</span>`; }
  if (k === 's') { const g = ING[INGI[v]]; return `<b>${g.name}の種</b><br>育成 ${secT(g.src[2])}（水やりで短縮）<br>${seasonText(v) || '旬：なし（一年中）'}${FANTASY.has(v) ? '<br>温室が必要' : ''}<br><span style="color:var(--sub)">持ち物で選んで、空いた区画をタップで植える</span>`; }
  if (k === 't') { const tl = TOOLI[v]; return `<b>${tl.name}</b><br>${tl.desc}`; }
  return '';
}
function charHTML(k, px) {
  const i = CH[k], sc = px / 18;
  return `<div class="ic" style="width:${16 * sc}px;height:${px}px;background-image:url(${URL_.charsUI});background-size:${IMG.charsUI.width * sc}px ${18 * sc}px;background-position:-${i * 16 * sc}px 0"></div>`;
}

// ====================================================== canvas & layout
const cv = $('cv'), ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
let U = 3, LH = 256;   // v0.46: LH＝画面の縦の長さ（縦長の端末では256より長くなり、余白なく縦いっぱいに使う）
function layout() {
  const W = window.innerWidth, H = window.innerHeight;
  U = Math.min(W / 144, H / 256); LH = Math.max(256, Math.min(320, Math.floor(H / U)));
  const root = $('root'); root.style.width = 144 * U + 'px'; root.style.height = LH * U + 'px';
  const cvE = $('cv'); if (cvE && cvE.height !== LH) { cvE.height = LH; if (typeof ctx !== 'undefined' && ctx) ctx.imageSmoothingEnabled = false; }
  VIEW_BOTTOM = LH - 32; document.documentElement.style.setProperty('--lh', LH);
  document.documentElement.style.setProperty('--u', U + 'px'); document.documentElement.style.setProperty('--f', (U * 1.3 * (typeof uiFs === 'function' ? uiFs() : 1)) + 'px');
}
window.addEventListener('resize', layout);

// ====================================================== scenes
const PLOTS = [];
for (const fx of [4, 84]) for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) PLOTS.push({x: fx + c * 14, y: 48 + r * 16, w: 12, h: 13});
// v0.59 丘の農地の畑（区画24〜47：1区・2区・3区の順に8つずつ）と果樹の位置（0〜3＝果樹園、4〜15＝丘）
const HILL_PY = [[326, 342], [252, 268], [106, 122]];
const HILL_TP = [[[92, 340], [120, 340], [92, 366], [120, 366]], [[92, 266], [120, 266], [92, 292], [120, 292]], [[92, 120], [120, 120], [92, 146], [120, 146]]];
for (let z = 0; z < 3; z++) for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) PLOTS.push({x: 4 + c * 14, y: HILL_PY[z][r], w: 12, h: 13});
const TREEPOS = [[92, 180], [120, 180], [92, 204], [120, 204], ...HILL_TP.flat()];
const SHELF_X = i => 5 + i * 13;
const TABLES = [[10,208],[86,218],[10,262],[86,274]];
const SHELF_Y = 155;
const SLOTS = {B:[0,68,20,92], C:[0,94,20,118], D:[124,82,144,106], E:[124,108,144,132]};
const SEATS = []; TABLES.forEach(([tx, ty]) => { SEATS.push({x: tx + 9, y: ty + 2}); SEATS.push({x: tx + 36, y: ty + 2}); });
const SCENES = {
  interior: {name:'宵闇亭　店内', short:'店内', objs:[
    {id:'back', lb:'裏口：農場へ出る', r:[4,16,24,34], st:[14,39], act:() => go('farm', 72, 50)},
    {id:'pantry', lb:'食材棚を見る', r:[26,16,58,33], st:[42,40], act:() => openInv()},
    {id:'ice', lb:'氷室を見る', r:[58,16,76,46], st:[66,50], act:() => openInv()},
    {id:'hearth', lb:'かまどで料理する', r:[74,16,126,50], st:[100,55], act:() => openCook()},
    {id:'prep', lb:'下ごしらえ台で料理する', r:[44,60,92,76], st:[68,81], act:() => openCook()},
    {id:'bed', lb:'ベッドで眠る', r:[98,112,120,128], st:[109,108], act:() => openBed()},
    {id:'sink', lb:'流し台', r:[126,54,144,78], st:[120,66], act:() => toast('流し台。洗い物は従業員の仕事だ。')},
    {id:'brew', lb:'醸造樽', r:[0,42,20,66], st:[25,54], act:() => openBrew()},
    ...Object.entries(SLOTS).map(([k, r]) => ({id:'slot' + k, slot:k, lb:'器具置き場', r, st:[r[0] < 50 ? 25 : 119, (r[1] + r[3]) / 2], act:() => openMachine(k)})),
    {id:'pass', lb:'配膳口', r:[38,138,86,153], st:[62,132], act:() => toast('配膳口。料理人の料理はここから客席側へ出る。')},
    ...[0,1,2,3,4].map(i => ({id:'shelf' + i, lb:`陳列棚${i + 1}：並べる・値付け`, r:[SHELF_X(i) - 1, 154, SHELF_X(i) + 12, 174], st:[SHELF_X(i) + 6, 160], act:() => openShelf(i)})),
    {id:'reg', lb:'レジ：棚と値付け', r:[74,150,102,166], st:[86,160], act:() => openShelf(-1)},
    {id:'door', lb:'外へ出る', r:[56,326,88,344], st:[72,324], act:() => go('outside', 72, 126)},
    {id:'cat', lb:'黒猫', r:[120,316,136,330], st:[114,322], act:() => catAct()},
  ]},
  outside: {name:'霧月通り（店の外）', short:'霧月通り', bound:[4,140,122,236], objs:[
    {id:'door', lb:'宵闇亭に入る', r:[60,96,84,121], st:[72,124], act:() => go('interior', 72, 322)},
    {id:'garden', lb:'庭のハーブを摘む', r:[2,122,42,172], st:[46,148], act:() => pickGarden()},
    {id:'market', lb:'市場で買い物', r:[2,164,24,186], st:[20,188], act:() => openMarket()},
    {id:'pier', lb:'釣り桟橋で釣る', r:[122,170,144,190], st:[130,200], act:() => openFish('pier')},
    {id:'board', lb:'依頼の掲示板', r:[126,140,144,164], st:[118,152], act:() => openOrders()},
    {id:'dungeon', lb:'地下迷宮に入る（古井戸）', r:[6,204,42,234], st:[46,222], act:() => openMineEntry()},
    {id:'guildway', lb:'冒険者ギルドへ', r:[114,244,144,274], st:[110,266], cond:() => unl('guild'), act:() => openWayChoice()},
    {id:'cat', lb:'黒猫', r:[42,164,58,178], st:[60,178], act:() => catAct()},
    {id:'trapB', lb:'かご罠（海岸）', r:[98,292,118,314], st:[94,304], act:() => openTrap('beach')},
    {id:'build', lb:'加工工房', r:[102,204,140,234], st:[98,222], act:() => openWorkshop()}, {id:'_x', lb:'', r:[0,0,0,0], st:[-99,-99], act:() => toast('🔒 建設予定地：新しい施設が建つ予定。（今後追加）')},
  ]},
  mine: {name:'地下迷宮', short:'地下迷宮', objs:[]},
  farm: {name:'宵闇亭　裏の農場', short:'裏の農場', bound:[4,140,46,236], objs:[
    {id:'back', lb:'店に戻る', r:[62,22,84,44], st:[72,48], act:() => go('interior', 14, 40)},
    ...PLOTS.slice(0, 24).map((p, i) => ({id:'plot' + i, r:[p.x - 1, p.y - 1, p.x + p.w + 1, p.y + p.h + 1], st:[p.x + 6, p.y + 16], act:() => tapPlot(i), plot:i})),
    {id:'cat', lb:'黒猫', r:[48,156,64,170], st:[66,168], act:() => catAct()},
    {id:'trapP', lb:'かご罠（生簀）', r:[40,140,62,152], st:[66,146], act:() => openTrap('pond')},
    ...[[92,180],[120,180],[92,204],[120,204]].map(([x, y], i) => ({id:'tree' + i, lb:'果樹', r:[x - 8, y - 16, x + 8, y + 4], st:[x, y + 8], act:() => tapTree(i), tree:i})),
    {id:'pond', lb:'生簀で釣る', r:[4,104,62,148], st:[66,126], act:() => openFish('pond')},
    {id:'shed', lb:'道具小屋', r:[86,100,134,142], st:[110,146], act:() => openShed()},
    {id:'compost', lb:'たい肥箱', r:[116,148,138,162], st:[127,166], act:() => openCompost()},
    {id:'coop', lb:'鶏小屋', r:[2,244,48,284], st:[52,290], act:() => openRanch('coop')},
    {id:'barn', lb:'牛舎', r:[84,242,142,288], st:[113,294], act:() => openRanch('barn')},
    {id:'trough', lb:'えさ箱にえさを入れる', r:[58,306,86,322], st:[72,328], act:() => openFeed()},
    {id:'bee', lb:'養蜂箱', r:[88,146,102,162], st:[96,166], act:() => S.fac.bee ? toast(`養蜂箱 Lv${S.fac.bee}：蜂蜜を自動で集めている。`) : lockedMsg('bee')},
    {id:'gh', lb:'温室', r:[6,168,62,216], st:[72,192], act:() => S.fac.greenhouse ? toast('温室：幻想の作物の種が市場で買えるようになった。') : lockedMsg('greenhouse')},
    {id:'orchard', lb:'果樹園', r:[104,152,138,166], st:[74,192], act:() => S.fac.orchard ? openOrchard() : lockedMsg('orchard')},
  ]},
};

// ---------- collision grid (2px cells) + A*
const GW = 72, GH = 266;
const WALKDEF = {
  interior: {areas:[[2,34,142,137],[98,134,116,156],[2,152,126,165],[108,163,126,184],[4,182,140,330]],
             blocks:[[58,16,76,47],[74,30,92,48],[90,16,126,50],[43,59,93,77],[125,53,144,79],[0,41,21,67],[0,67,21,119],[123,81,144,133],
                     ...TABLES.map(([tx, ty]) => [tx - 1, ty - 6, tx + 45, ty + 21]), [98,112,121,129], [120,294,142,318], [98,113,121,129], [2,182,18,202], [127,238,142,258], [2,310,18,328], [120,316,136,330]]},
  outside:  {areas:[[2,118,142,316]],
             blocks:[[116,238,144,320],[0,238,10,320],[0,118,44,174],[98,118,144,148],[124,142,144,170],[112,120,128,150],[102,146,128,160],[0,200,46,238],[100,200,142,238],[41,108,47,128],[97,152,103,174],[41,192,47,212],[9,166,19,184],[123,166,133,184],[40,164,52,176]]},
  farm:     {areas:[[2,44,142,380]],
             blocks:[[86,172,98,182],[114,172,126,182],[86,196,98,206],[114,196,126,206],[4,244,46,284],[86,244,140,288],[60,307,84,322],[47,295,58,303],[87,299,98,307],[70,293,74,308],[2,102,64,150],[84,98,136,143],[88,146,104,163],[116,148,138,162],[4,168,64,216],[69,136,75,154],[69,206,75,224],[46,156,58,166]]},
};
const WALK = {};
function buildWalk() {
  for (const sc in WALKDEF) {
    const g = new Uint8Array(GW * GH), d = WALKDEF[sc];
    for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
      const x = cx * 2 + 1, y = cy * 2 + 1;
      const inA = d.areas.some(r => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);
      const inB = d.blocks.some(r => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);
      g[cy * GW + cx] = inA && !inB ? 1 : 0;
    }
    WALK[sc] = g;
  }
}
const walkable = (sc, x, y) => { const cx = x >> 1, cy = y >> 1; return cx >= 0 && cy >= 0 && cx < GW && cy < GH && WALK[sc][cy * GW + cx] === 1; };
function nearestWalk(sc, x, y) {
  const g = WALK[sc]; let cx = Math.max(0, Math.min(GW - 1, x >> 1)), cy = Math.max(0, Math.min(GH - 1, y >> 1));
  if (!g) return [cx, cy];
  if (g[cy * GW + cx]) return [cx, cy];
  for (let r = 1; r < 40; r++) { let best = null, bd = 1e9;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || !g[ny * GW + nx]) continue;
      const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = [nx, ny]; } }
    if (best) return best; }
  return [cx, cy];
}
function los(sc, x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; if (!walkable(sc, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t))) return false; } return true;
}
function astar(sc, fx, fy, tx, ty) {
  const g = WALK[sc]; const [sx, sy] = nearestWalk(sc, fx | 0, fy | 0), [ex, ey] = nearestWalk(sc, tx | 0, ty | 0);
  const N = GW * GH, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const open = [[0, sy * GW + sx]]; gs[sy * GW + sx] = 0; const E = ey * GW + ex; let found = false, it = 0;
  const h = i => { const x = i % GW, y = (i / GW) | 0; return Math.hypot(x - ex, y - ey); };
  while (open.length && it++ < 9000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, cur] = open.splice(bi, 1)[0]; if (cur === E) { found = true; break; } if (closed[cur]) continue; closed[cur] = 1;
    const cx = cur % GW, cy = (cur / GW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const ni = ny * GW + nx;
      if (!g[ni] || closed[ni]) continue; if (dx && dy && (!g[cy * GW + nx] || !g[ny * GW + cx])) continue;
      const ng = gs[cur] + (dx && dy ? 1.414 : 1); if (ng < gs[ni]) { gs[ni] = ng; from[ni] = cur; open.push([ng + h(ni), ni]); } }
  }
  if (!found) return [[ex * 2 + 1, ey * 2 + 1]];
  const pts = []; for (let c = E; c !== -1; c = from[c]) pts.push([(c % GW) * 2 + 1, ((c / GW) | 0) * 2 + 1]); pts.reverse();
  const out = []; let a = [fx, fy], i = 0;
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !los(sc, a[0], a[1], pts[j][0], pts[j][1])) j--; out.push(pts[j]); a = pts[j]; i = j; }
  if (!out.length) out.push(pts[pts.length - 1]);
  return out;
}
// zone-based pathing inside the shop (legacy)
function zone(x, y) { return y < 86 ? 'K' : (y < 116 ? 'A' : 'D'); }
const WP = {Kd:[119,80], Ad:[119,104], Ag:[117,108], Dg:[117,132]};
function route(sc, fx, fy, tx, ty) { return astar(sc, fx, fy, tx, ty); }
function route_old(sc, fx, fy, tx, ty) {
  if (sc !== 'interior') return [[tx, ty]];
  const a = zone(fx, fy), b = zone(tx, ty), P = [];
  const seq = {K:0, A:1, D:2};
  if (a === b) return [[tx, ty]];
  if (seq[a] < seq[b]) { if (a === 'K') P.push(WP.Kd, WP.Ad); if (b === 'D') P.push(WP.Ag, WP.Dg); }
  else { if (a === 'D') P.push(WP.Dg, WP.Ag); if (b === 'K') P.push(WP.Ad, WP.Kd); }
  P.push([tx, ty]); return P;
}
function clampWalk(sc, x, y) { const [cx, cy] = nearestWalk(sc, x | 0, y | 0); return [cx * 2 + 1, cy * 2 + 1]; }
function clampWalk_old(sc, x, y) {
  if (sc === 'interior') {
    const z = zone(x, y);
    if (z === 'K') return [Math.max(30, Math.min(138, x)), Math.max(64, Math.min(80, y))];
    if (z === 'A') return [Math.max(4, Math.min(124, x)), Math.max(102, Math.min(108, y))];
    return [Math.max(6, Math.min(138, x)), Math.max(130, Math.min(228, y))];
  }
  const b = SCENES[sc].bound; return [Math.max(b[0], Math.min(b[1], x)), Math.max(b[2], Math.min(b[3], y))];
}

// ====================================================== actors (visual only)
let scene = 'interior';
const player = {x:86, y:160, path:[], onArrive:null, flip:false, k:'player'};
let actors = [];   // npcs in current scene
let custVis = [];  // visual customers
function buildActors() {
  actors = [];
  if (scene === 'interior') {
    for (let i = 0; i < S.staff.cook; i++) actors.push({k:'cook', role:'cook', x:40 + i * 10, y:100, path:[], wait:rnd(0, 2), i});
    for (let i = 0; i < S.staff.clerk; i++) actors.push({k:'clerk', role:'clerk', x:20 + i * 16, y:159, path:[], wait:rnd(0, 2), i});
  } else if (scene === 'farm') {
    for (let i = 0; i < S.staff.farmer; i++) actors.push({k:'farmer', role:'farmer', x:20 + i * 20, y:96, path:[], wait:rnd(0, 2), i});
    for (let i = 0; i < S.staff.fisher; i++) actors.push({k:'fisher', role:'fisher', x:66, y:110 + i * 9, path:[], wait:rnd(0, 3), i});
    for (let i = 0; i < (S.fac.coop || 0) * 2; i++) actors.push({k:'chicken', role:'animal', kind:'chicken', area:[8,292,58,340], x:rnd(10, 56), y:rnd(295, 338), path:[], wait:rnd(0, 3), i});
    for (let i = 0; i < (S.fac.barn || 0); i++) actors.push({k:'cow', role:'animal', kind:'cow', area:[94,302,136,340], x:rnd(96, 134), y:rnd(305, 338), path:[], wait:rnd(0, 4), i});
  } else if (scene === 'hill') {
    const hz = hillLv() ? Math.min(S.staff.farmer, 2) : 0; for (let i = 0; i < hz; i++) actors.push({k:'farmer', role:'hfarmer', x:72, y:300 - i * 40, path:[], wait:rnd(0, 2), i});
    for (const k in HANI) for (let i = 0; i < haniN(k); i++) { const r = HANI[k].area; actors.push({k, role:'animal', kind:k, area:r, x:rnd(r[0], r[2]), y:rnd(r[1], r[3]), path:[], wait:rnd(0, 4), i}); }
  } else if (scene === 'outside') {
    RESIDENTS.forEach((r, i) => { if (!resHere(r)) return; const p = clampWalk('outside', rnd(40, 120), rnd(140, 200)); actors.push({k:r.k, role:'res', res:i, x:p[0], y:p[1], path:[], wait:rnd(0, 3)}); });
  }
  custVis = [];
}
function npcThink(a) {
  const R = (x, y) => clampWalk(scene, x, y);
  if (a.role === 'cook') { const pts = [[42,40],[66,50],[56,81],[100,55],[84,52],[62,132]]; a.step = ((a.step || 0) + 1) % pts.length; const p = pts[a.step]; a.path = route(scene, a.x, a.y, p[0] + a.i * 3, p[1] + (a.i % 2) * 4); a.wait = rnd(.8, 2.2); }
  else if (a.role === 'clerk') { const p = R(rnd(6, 100), rnd(156, 162)); a.path = route(scene, a.x, a.y, p[0], p[1]); a.wait = rnd(1, 3); }
  else if (a.role === 'farmer') { const p = PLOTS[Math.floor(rnd(0, plotCount()))]; a.path = route(scene, a.x, a.y, p.x + 6, p.y + 15); a.wait = rnd(1.5, 3.5); }
  else if (a.role === 'hfarmer') { const ps = scenePlots('hill'); if (!ps.length) { a.wait = 4; return; } const p = PLOTS[ps[Math.floor(rnd(0, ps.length))]]; a.path = route(scene, a.x, a.y, p.x + 6, p.y + 15); a.wait = rnd(1.5, 3.5); }
  else if (a.role === 'fisher') { a.path = route(scene, a.x, a.y, 68, 108 + a.i * 9 + rnd(-2, 2)); a.wait = rnd(3, 6); }
  else if (a.role === 'animal') { const r = a.area; a.path = [[rnd(r[0], r[2]), rnd(r[1], r[3])]]; a.wait = rnd(2, 6); }
  else if (a.role === 'res') { const p = R(rnd(46, 120), rnd(126, 200)); a.path = route(scene, a.x, a.y, p[0], p[1]); a.wait = rnd(2, 6); }
}
function moveAlong(a, dt, speed = 42) {
  if (!a.path.length) return true;
  const [tx, ty] = a.path[0], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), st = speed * dt;
  if (Math.abs(dx) > .3) a.flip = dx < 0;
  if (d <= st) { a.x = tx; a.y = ty; a.path.shift(); a.walk = a.path.length > 0; return !a.path.length; }
  a.x += dx / d * st; a.y += dy / d * st; a.walk = true; return false;
}
function spawnCustVis(ev) {
  if (scene !== 'interior' || custVis.length > 8) return;
  const sx = SHELF_X(ev.slot) + 6;
  const c = {k:ev.kind, x:72, y:334, path:route('interior', 72, 326, sx, 186), ev, phase:'in', t:0};
  custVis.push(c);
}
function updCust(c, dt) {
  c.t += dt;
  if (c.phase === 'in') { if (moveAlong(c, dt, 34)) { c.phase = 'react'; c.t = 0; } }
  else if (c.phase === 'react') {
    if (c.t > 1.4) {
      if (c.ev.buy) {
        floatAt(c.x, c.y - 22, '+' + fmt(c.ev.price) + 'G');
        const free = SEATS.findIndex((s, i) => !custVis.some(o => o.seat === i));
        if (free >= 0 && Math.random() < .75) { c.seat = free; c.phase = 'toseat'; c.path = route('interior', c.x, c.y, SEATS[free].x, SEATS[free].y + 22).concat([[SEATS[free].x, SEATS[free].y]]); }
        else { c.phase = 'out'; c.path = route('interior', c.x, c.y, 72, 326).concat([[72, 336]]); }
      } else { c.phase = 'out'; c.path = route('interior', c.x, c.y, 72, 326).concat([[72, 336]]); }
    }
  } else if (c.phase === 'toseat') { if (moveAlong(c, dt, 34)) { c.phase = 'eat'; c.t = 0; c.dur = rnd(12, 24); } }
  else if (c.phase === 'eat') { if (c.t > c.dur) { c.phase = 'out'; c.seat = -1; c.path = [[c.x, c.y + 22]].concat(route('interior', c.x, c.y + 22, 72, 326), [[72, 336]]); } }
  else if (c.phase === 'out') { if (moveAlong(c, dt, 34)) c.dead = true; }
}

// ====================================================== logic
function modeMult() { return {strong:1.3, normal:1.05, cheap:.85}[S.auto.mode] * (S.staff.clerk && perkN('clerk', 'eye') ? 1.05 : 1); }
function modeRate() { return {strong:.8, normal:1, cheap:1.35}[S.auto.mode]; }
function custInterval() {
  const repF = .5 + S.rep / 100, signF = 1 + .2 * S.fac.sign, clerkF = 1 + .2 * S.staff.clerk;
  return Math.max(1.3, 16 / (1.2 * (uniOn('black') ? 1.03 : 1) * (1 + .05 * masterN('clerk')) * (1 + .06 * (S.fac.courtyard || 0)) * townCustMul() * mrHelp('shop') * (typeof rsCust === 'function' ? rsCust() : 1) * (wxOn('storm') ? .7 : 1) * repF * signF * clerkF * (1 + .12 * rankIdx()) * (evOn('summer') ? 1.3 : 1) * (S.auto.sell && S.staff.clerk ? modeRate() : 1) * (perkOn('noa') ? 1.05 : 1) * (S.staff.clerk ? 1 + .05 * perkN('clerk', 'talk') : 1) * (S.buzzT > S.t ? 1.3 : 1) * (1 + .12 * (S.fac.upstairs || 0)) * (S.fac.terrace && !wxOn('rain') && !wxOn('storm') ? 1 + .08 * S.fac.terrace : 1) * (S.fac.bar && isNightHm() ? 1 + .15 * S.fac.bar : 1) * decorRate()));
}
function reaction(price, v) { const r = price / v; return r <= .85 ? 'cheap' : r <= 1.1 ? 'fair' : r <= 1.35 ? 'pricey' : 'no'; }
function nbRecord(key, g, price, re) {
  const k = key + (g ? '*' : ''); const n = S.nb[k] || (S.nb[k] = {});
  if (re === 'no') n.no = Math.min(n.no || 1e9, price); else n[re] = Math.max(n[re] || 0, price);
  // 境目は 安い＜ちょうど＜高い＜高すぎ の順になるはず。食い違う古い記録は消す
  if (re === 'cheap') { for (const q of ['fair', 'pricey']) if (n[q] && n[q] <= price) delete n[q]; if (n.no && n.no <= price) delete n.no; }
  if (re === 'fair') { if (n.cheap && n.cheap >= price) delete n.cheap; if (n.pricey && n.pricey <= price) delete n.pricey; if (n.no && n.no <= price) delete n.no; }
  if (re === 'pricey') { for (const q of ['cheap', 'fair']) if (n[q] && n[q] >= price) delete n[q]; if (n.no && n.no <= price) delete n.no; }
  if (re === 'no') for (const q of ['cheap', 'fair', 'pricey']) if (n[q] && n[q] >= price) delete n[q];
}
function buyMarket(id, n) { const g = ING[INGI[id]]; const cost = g.src[1] * n; if (S.gold < cost) return false; S.gold -= cost; withQ(1, () => add(S.inv, id, n)); S.known.i[id] = true; return true; }
// v0.52.4：作るリストに必要な食材は、料理人が倉庫から使わずに取っておく（カバン・持ち物にある分は差し引く）
const wishHoldC = {k:null, m:{}};
function wishHold(id) {
  const key = wishVer + ':' + S.t; if (wishHoldC.k !== key) { wishHoldC.k = key; wishHoldC.m = {}; } if (id in wishHoldC.m) return wishHoldC.m[id]; return (wishHoldC.m[id] = wishHold0(id));
}
function wishHold0(id) { if (!S.wish) return 0; let has = false; for (const k in S.wish) { has = true; break; } if (!has) return 0; const n = wishNeed()[id] || 0; return n ? Math.max(0, n - bagCount('i', id, false)) : 0; }
const staffAvail = id => Math.max(0, (S.inv[id] || 0) - wishHold(id));
function canCook(r, autoBuy) {
  const need = {}; r.ings.forEach(id => need[id] = (need[id] || 0) + 1);
  let cost = 0;
  for (const id in need) {
    const lack = need[id] - staffAvail(id);
    if (lack > 0) { const g = ING[INGI[id]]; if (!autoBuy || g.src[0] !== 'market') return -1; cost += g.src[1] * lack; }
  }
  return cost;
}
const bday = () => Math.floor((S.t - 360) / 1440);
function budget() { if (!S.budget || S.budget.d !== bday()) S.budget = {d:bday(), cap:Math.max(150, Math.round(S.gold * (S.buyPct || 40) / 100)), spent:0, floor:Math.round(S.gold * .25)}; return S.budget; }
function canSpend(c) { const B = budget(); return B.spent + c <= B.cap && S.gold - c >= B.floor; }
function spend(c) { const B = budget(); B.spent += c; rep_.spent = (rep_.spent || 0) + c; }
let staffBuying = false;
function brewStep() {
  const ms = MACH.filter(m => { const st = S.mach[m.id]; return st && st.lv && st.auto != null && m.recipes[st.auto] && m.recipes[st.auto].lv <= st.lv && st.q.length < 2 + st.lv * 2; });
  if (!ms.length) return false; S.brewI = ((S.brewI || 0) + 1) % ms.length;
  for (let k = 0; k < ms.length; k++) { const m = ms[(S.brewI + k) % ms.length], st = S.mach[m.id], r = m.recipes[st.auto], c = {}; r.ins.forEach(x => c[x] = (c[x] || 0) + 1);
    let cost = 0, ok = true; for (const x in c) { const l = c[x] - staffAvail(x); if (l > 0) { if (!S.auto.buy || ING[INGI[x]].src[0] !== 'market') { ok = false; break; } cost += ING[INGI[x]].src[1] * l; } }
    if (!ok || (cost && !canSpend(cost))) continue;
    for (const x in c) { const l = c[x] - staffAvail(x); if (l > 0) { spend(ING[INGI[x]].src[1] * l); buyMarket(x, l); if (perkN('brewer', 'thrift')) S.gold += Math.round(ING[INGI[x]].src[1] * l * .2); } }
    r.ins.forEach(x => add(S.inv, x, -1)); st.q.push({r:st.auto, t:0, b:perkN('brewer', 'double') ? 1 : 0}); return true; }
  return false;
}
function staffCook(ci = 0) {
  const ce = (S.emp && S.emp.cook && S.emp.cook[ci]) || {};
  if (dishTotal() >= 60 + S.fac.shelf * 15 + (S.fac.kitchen || 0) * 35) { S.idle = S.idle || {}; S.idle.cook = '倉庫の料理がいっぱい。棚に並べて売ろう'; return null; }
  const opts = []; let budgetOut = false;
  for (const ri in S.known.r) {
    if (S.menu[ri] === false) continue;
    { const cp = S.capR && S.capR[ri]; if (cp && (S.dish['r' + ri] || 0) + (S.dishG['r' + ri] || 0) + S.shelf.filter(x => x.key === 'r' + ri).reduce((a, x) => a + x.n, 0) >= cp) continue; }
    const r = REC[ri], c = canCook(r, S.auto.buy);
    if (c < 0 || (c > 0 && !canSpend(c))) { if (c > 0) budgetOut = true; continue; }
    const stock = S.dish['r' + ri] || 0, rv = reserveMap()['r' + ri] || 0;
    opts.push({ri, c, score: (r.value - c) / (1 + stock * .5) * (stock < rv ? 6 : 1)});
  }
  if (!opts.length) { S.idle = S.idle || {}; S.idle.cook = budgetOut ? `今日の仕入れ予算（${fmt(budget().cap)}G）を使い切った。予算は従業員タブで変えられる` : Object.keys(S.known.r).length ? '作ったことのあるレシピの材料が足りない（畑の作物や魚は自動で買えない）' : 'まだ一度も作ったレシピがない。かまどで一度作ると覚える'; return null; }
  if (S.idle) S.idle.cook = '';
  opts.sort((a, b) => b.score - a.score);
  const o = opts[Math.min(opts.length - 1, Math.floor(Math.random() * Math.min(3, opts.length)))];
  const r = REC[o.ri];
  if (o.c > 0) spend(o.c);
  { const use = {}; r.ings.forEach(id => { use[id] = (use[id] || 0) + 1; if (staffAvail(id) < use[id] && buyMarket(id, 1) && ce.p10 === 'thrift') S.gold += Math.round(ING[INGI[id]].src[1] * .2); }); }
  const sq = r.ings.reduce((a, id) => a + qOf(id), 0) / r.ings.length + (ce.p5 === 'plate' ? .3 : 0) + (ce.master ? .3 : 0); r.ings.forEach(id => add(S.inv, id, -1));
  blendDQ('r' + o.ri, 1, Math.min(3, sq)); add(ce.p10 === 'gold' && Math.random() < .08 ? S.dishG : S.dish, 'r' + o.ri, 1); S.stat.cooked++; S.mast['r' + o.ri] = (S.mast['r' + o.ri] || 0) + 1; ultCooked('r' + o.ri);
  return r;
}
// keep some dishes in storage (A) and reserve dishes for upcoming events (D)
let resvCache = {t:-1, m:{}};
function reserveMap() {
  if (resvCache.t === Math.floor(S.t / 30)) return resvCache.m;
  const m = {}, addR = (k, n) => { m[k] = Math.max(m[k] || 0, n); };
  if (S.resv) addR(S.resv.key, S.resv.n);
  if (unl('orders')) for (const o of S.orders) if (S.known.r[o.ri]) addR('r' + o.ri, o.n);
  if (unl('contest') && weekDay() >= 3 && !contestTheme().done) { const th = contestTheme().th; let best = null;
    for (const ri in S.known.r) { const k = 'r' + ri; if (themeFit(k, th) && (!best || REC[ri].value > REC[best].value)) best = +ri; }
    if (best != null) addR('r' + best, 2); }
  if (unl('critic') && S.critic && S.critic.at && S.critic.at - S.t < 1440) { let best = null; for (const ri in S.known.r) if (!best || REC[ri].value > REC[best].value) best = +ri; if (best != null) addR('r' + best, 1); }
  resvCache = {t:Math.floor(S.t / 30), m}; return m;
}
const keepOf = key => Math.max(S.keepN == null ? 3 : S.keepN, reserveMap()[key] || 0);
function restock() {
  if (!(S.auto.sell && S.staff.clerk > 0)) return;
  const used = new Set(S.shelf.filter(s => s.n > 0).map(s => s.key + (s.g ? '*' : '')));
  const spare = (src, k, g) => Math.max(0, (src[k] || 0) - (g ? 0 : keepOf(k)));
  for (let i = 0; i < shelfCount(); i++) {
    const s = S.shelf[i];
    if (s.n > 0 && s.n < 5) { const src = s.g ? S.dishG : S.dish; const m = Math.min(5 - s.n, spare(src, s.key, s.g)); if (m) { add(src, s.key, -m); s.n += m; } if (!s.man) s.price = Math.round(dval(s.key, s.g) * modeMult()); continue; }
    if (s.n > 0) { if (!s.man) s.price = Math.round(dval(s.key, s.g) * modeMult()); continue; }
    let best = null;
    for (const [src, g] of [[S.dishG, true], [S.dish, false]]) for (const k in src) { if (used.has(k + (g ? '*' : '')) || spare(src, k, g) <= 0) continue; const v = dval(k, g); if (!best || v > best.v) best = {k, g, v}; }
    if (!best) continue;
    const src = best.g ? S.dishG : S.dish, m = Math.min(5, spare(src, best.k, best.g));
    add(src, best.k, -m); Object.assign(s, {key:best.k, g:best.g, n:m, man:false, price:Math.round(best.v * modeMult())}); used.add(best.k + (best.g ? '*' : ''));
  }
}
function fishRoll(loc, bonus = 0, rod = null) {
  const rare = rod ? rod.rare : 0;
  const fog = (evOn('fog') ? 3 : 1) * (wxOn('fog') ? 2 : 1);
  const list = (loc === 'lake' ? LAKE.map(id => ING[INGI[id]]) : loc === 'pond' ? POND : PIER).filter(g => !RARE_FISH.has(g.id) || (rod && rod.id === 'rod4'))
    .map(g => ({g, w: g.src[1] * (g.src[1] <= 10 ? (1 + S.fac.pond * .6 + bonus + rare * .7 + medalT('fish') * .15) * fog : 1)}));
  return wpick(list).g;
}
// v0.60 釣り師の釣果の偏りを減らす：珍しい魚の重みの伸びに上限（よく釣れる魚の半分まで）、たくさん持っている魚は出にくく
function staffFish(bonus = 0) {
  const fog = (evOn('fog') ? 3 : 1) * (wxOn('fog') ? 2 : 1), list = POND.filter(g => !RARE_FISH.has(g.id)), top = Math.max(...list.map(g => g.src[1]));
  return wpick(list.map(g => { let w = g.src[1]; if (w <= 10) w = Math.min(w * (1 + S.fac.pond * .6 + bonus + medalT('fish') * .15) * fog, top * .5);
    return {g, w: w / (1 + haveAnyIng(g.id) / 30)}; })).g;
}
// v0.60 農夫の植え替えの偏りを減らす：前と同じ作物が、ほかの作物よりずっと多くあるときは、少ない作物（旬は優先）に植え替える
function farmerPick(last, pl) {
  const cand = SEEDS.filter(g => g.src[1] > 0 && g.src[1] <= 30 && !HYBS.has(g.id) && !FANTASY.has(g.id) && (S.known.i[g.id] || g.id === last));
  if (!cand.length) return last; const grow = {}; for (const i of PIDX()) { const p = S.plots[i]; if (p.seed) grow[p.seed] = (grow[p.seed] || 0) + 1.5; }
  const sc = id => (haveAnyIng(id) + (grow[id] || 0)) / (inSeason(id) ? 1.5 : 1);
  const ss = cand.map(g => sc(g.id)).sort((a, b) => a - b), med = ss[Math.floor(ss.length / 2)];
  const so = soilOn() && pl, rotBad = so && pl.fam && cropFam(last) === pl.fam, lean = so && soilV(pl) < 35;   // v0.64 輪作：前と同じ仲間は避け、やせた畑には豆
  if (last && !rotBad && !lean && (sc(last) < 20 || sc(last) < med * 1.5 + 10)) return last;
  let pool = cand.filter(g => !(so && pl.fam && cropFam(g.id) === pl.fam)); if (lean) { const bn = pool.filter(g => cropFam(g.id) === 'bean'); if (bn.length) pool = bn; } if (!pool.length) pool = cand;
  const low = pool.slice().sort((a, b) => sc(a.id) - sc(b.id)).slice(0, 4); return pick(low).id;
}
let farmQB = 0;
// v0.64 畑の土と輪作：区画ごとの土の肥えぐあい（p.soil 0〜100、はじめ60）と、前に育てた作物の仲間（p.fam）
const CROP_FAM = {leaf:['cabbage', 'spinach', 'lettuce', 'hakusai', 'komatsuna', 'shungiku', 'mizuna', 'nira', 'leek', 'celery', 'broccoli', 'cauliflower', 'asparagus', 'jadeleaf'],
  root:['carrot', 'daikon', 'turnip', 'burdock', 'lotus', 'onion', 'garlic', 'ginger', 'blackgarlic', 'mandrake'],
  fruit:['tomato', 'eggplant', 'pepper', 'pumpkin', 'cucumber', 'zucchini', 'paprika', 'okra', 'chili', 'melon', 'watermelon', 'strawberry', 'blueberry', 'tomaberry', 'dragonpepper', 'sunpumpkin', 'nightshade', 'abyssplum'],
  bean:['soy', 'edamame', 'peanut'], grain:['wheat', 'rice', 'corn', 'sesame', 'starrice'], tuber:['potato', 'sweetpotato', 'satoimo', 'nagaimo', 'goldpotato'],
  herb:['basil', 'mint', 'shiso', 'fairy_flower', 'manna'], mush:['shiitake', 'moonshroom', 'moonshiitake']};
const FAM_N = {leaf:'葉もの', root:'根もの', fruit:'実もの', bean:'豆', grain:'穀物', tuber:'いも', herb:'香草・花', mush:'きのこ'};
const FAM_OF = {}; for (const k in CROP_FAM) CROP_FAM[k].forEach(id => FAM_OF[id] = k);
const cropFam = id => FAM_OF[id] || 'fruit';
const soilOn = () => unl('quality');
const soilV = p => p.soil == null ? 60 : p.soil;
const soilLv = v => v >= 75 ? 3 : v >= 45 ? 2 : v >= 25 ? 1 : 0;
const SOIL_N = ['カラカラ', 'やせた土', 'ふつうの土', '肥えた土'];
const soilGrow = p => !soilOn() ? 1 : [.8, .92, 1, 1.12][soilLv(soilV(p))];
function soilHarvest(p, seed) {   // 収穫のときの土の変化と、品質・量への効き目
  if (!soilOn()) return {q:0, n:0, rot:0};
  const fam = cropFam(seed), same = p.fam === fam, v = soilV(p);
  const q = (v - 50) / 50 * .6 + (same ? -.4 : p.fam ? .3 : 0), n = (v >= 75 && Math.random() < .25 ? 1 : 0) + (!same && p.fam && Math.random() < .2 ? 1 : 0) - (same && v < 45 && Math.random() < .3 ? 1 : 0);
  p.soil = Math.max(0, Math.min(100, v + (fam === 'bean' ? 15 : fam === 'herb' ? -2 : same ? -12 : -5)));
  const rot = !same && !!p.fam; p.fam = fam; if (rot) S.stat.rot = (S.stat.rot || 0) + 1; return {q, n, rot, same};
}
function soilRest(dt) { if (!soilOn()) return; for (const i of PIDX()) { const p = S.plots[i]; if (!p.seed && soilV(p) < 70) p.soil = Math.min(70, soilV(p) + dt / 60 * 2); } }   // 空けておくと少しずつ戻る（1時間に+2、70まで）
const harvestPlot = (i, toBag) => {
  const p = S.plots[i]; if (!p.seed) return null;
  const g = ING[INGI[p.seed]]; const gold = Math.random() < .05 * luckMul() * (p.fz === 'fert2' ? 3 : 1);
  const sh = soilHarvest(p, p.seed);
  const n = Math.max(1, 1 + (Math.random() < .35 ? 1 : 0) + (evOn('harvest') ? 1 : 0) + (brLv(p.seed) >= 3 ? 1 : 0) + sh.n);
  const hq = (brLv(p.seed) >= 2 ? .4 : 0) + farmQB + 1 + ((p.w || 1) > 1 ? .5 : 0) + (p.fz ? .6 : 0) + (inSeason(p.seed) ? .7 : 0) + rnd(-.2, .3) + sh.q;
  withQ(hq, () => { if (toBag) { giveBag('i', p.seed, gold, gold ? 1 : n); if (gold && n > 1) giveBag('i', p.seed, false, n - 1); }
  else { add(gold ? S.invG : S.inv, p.seed, gold ? 1 : n); if (gold) add(S.inv, p.seed, n - 1); } });
  S.known.i[p.seed] = true;
  p.last = p.seed; S.stat.harvested++; legRoll(.0015, 'sennen_ninjin', '畑から、とんでもなく立派な人参が出てきた。');
  if (p.fz === 'fert3') { p.fz = 'used3'; p.g = 0; p.w = 0; }
  else { p.seed = null; p.g = 0; p.w = 0; p.fz = null; }
  if (sh.same && soilV(p) < 45 && !S.soilWarn) { S.soilWarn = 1; tut('m_soil'); }
  return {g, n, gold, rot:sh.rot};
};
function plantPlot(i, id, autoBuy) {
  const p = S.plots[i]; if (p.seed || !plotOn(i)) return false;
  const g = ING[INGI[id]];
  if (FANTASY.has(id) && !S.fac.greenhouse) return false;
  if (!haveSeed(id)) { if (!autoBuy || HYBS.has(id) || S.gold < g.src[1] || (staffBuying && !canSpend(g.src[1]))) return false; if (staffBuying) spend(g.src[1]); S.gold -= g.src[1]; add(S.seeds, id, 1); }
  takeSeed(id, 1); p.seed = id; p.t0 = S.t; p.g = 0; p.w = 0; p.last = id; S.stat.planted++; dirty = true; return true;
}
const ready = p => p.seed && (p.g || 0) >= ING[INGI[p.seed]].src[2];
const TOOL_DUR = {can1:40, can2:80, can3:120, can4:200, rod1:30, rod2:60, rod3:100, rod4:150, sk1:60, sk2:120, hoe1:80, hoe2:150};
const STACK = 99, BAG_N = 24;
const toolInst = uid => S.toolInv.find(t => t.uid === uid && t.dur > 0);   // v0.54：壊れた道具（耐久0）は持てない
const toolOf = h => TOOLI[(toolInst(h.uid) || {}).id] || {};
// ----- bag (0-7 hotbar, 8-23 backpack). slot: {k:'i'|'s'|'d'|'t', id|key|uid, g, n}
const sameItem = (a, b) => a && b && a.k === b.k && a.k !== 't' && (a.id || a.key) === (b.id || b.key) && !!a.g === !!b.g;
function bagCount(k, id, g = false) { let n = 0; for (const sl of S.bag) if (sl && sl.k === k && (sl.id || sl.key) === id && !!sl.g === !!g) n += sl.n; return n; }
function storeOf(k, g) { return k === 'i' ? (g ? S.invG : S.inv) : k === 'd' ? (g ? S.dishG : S.dish) : S.seeds; }
const haveIng = (id, g = false) => ((g ? S.invG : S.inv)[id] || 0) + bagCount('i', id, g);
const shelfHas = (key, g = false) => S.shelf.reduce((a, s) => a + (s.key === key && !!s.g === !!g ? s.n : 0), 0);
const haveDish = (key, g = false) => ((g ? S.dishG : S.dish)[key] || 0) + bagCount('d', key, g) + shelfHas(key, g);
const haveSeed = id => (S.seeds[id] || 0) + bagCount('s', id);
function takeItem(k, id, g, n) {
  const st = storeOf(k, g), a = Math.min(n, st[id] || 0); if (a) add(st, id, -a); n -= a;
  for (let i = BAG_N - 1; i >= 0 && n > 0; i--) { const sl = S.bag[i]; if (sl && sl.k === k && (sl.id || sl.key) === id && !!sl.g === !!g) { const b = Math.min(n, sl.n); sl.n -= b; n -= b; if (sl.n <= 0) S.bag[i] = null; } }
  if (k === 'd') for (const sh of S.shelf) { if (n <= 0) break; if (sh.key === id && !!sh.g === !!g && sh.n > 0) { const b = Math.min(n, sh.n); sh.n -= b; n -= b; } }
  dirty = true; return n <= 0;
}
const takeIng = (id, g, n) => takeItem('i', id, g, n), takeDish = (key, g, n) => takeItem('d', key, g, n), takeSeed = (id, n) => takeItem('s', id, false, n);
function mkSlot(k, id, g, n) { return k === 'd' ? {k, key:id, g:!!g, n} : k === 't' ? {k, uid:id} : {k, id, g:!!g, n}; }
function giveBag(k, id, g, n) {   // returns leftover moved to storage
  if (k === 'i' && curQ != null && n > 0) { if (!g) blendQ(id, n, curQ); const cq = curQ; curQ = null; const r = giveBag(k, id, g, n); curQ = cq; return r; }
  for (const sl of S.bag) if (n > 0 && sl && sl.k === k && (sl.id || sl.key) === id && !!sl.g === !!g && sl.n < STACK) { const a = Math.min(n, STACK - sl.n); sl.n += a; n -= a; }
  const order = k === 'i' && (FERTS.has(id) || id === 'scroll') ? [1,2,3,4,5,6,7,0].concat([...Array(16).keys()].map(i => i + 8)) : [...Array(16).keys()].map(i => i + 8).concat([1,2,3,4,5,6,7,0]);
  for (const i of order) if (n > 0 && !S.bag[i]) { const a = Math.min(n, STACK); S.bag[i] = mkSlot(k, id, g, a); n -= a; }
  if (n > 0) add(storeOf(k, g), id, n);
  if (k === 'i') S.known.i[id] = true;
  dirty = true; renderHot(); return n;
}
function giveTool(uid) { const order = [1,2,3,4,5,6,7].concat([...Array(16).keys()].map(i => i + 8)); for (const i of order) if (!S.bag[i]) { S.bag[i] = {k:'t', uid}; renderHot(); return true; } return false; }
function depositSlot(i) {
  const sl = S.bag[i]; if (!sl) return;
  if (sl.k !== 't') add(storeOf(sl.k, sl.g), sl.id || sl.key, sl.n);
  S.bag[i] = null; dirty = true;
}
function heldItem() {
  const sl = S.bag[S.sel]; if (!sl) return null;
  if (sl.k === 't') return toolInst(sl.uid) ? {t:'tool', uid:sl.uid} : null;
  if (sl.k === 's') return {t:'seed', id:sl.id, slot:sl};
  if (sl.k === 'i') return {t:'ing', id:sl.id, g:sl.g};
  return {t:'dish', key:sl.key, g:sl.g};
}
function newTool(id) { tut('tool_' + TOOLI[id].kind); const uid = (S.uidN = (S.uidN || 0) + 1); S.toolInv.push({uid, id, dur:TOOL_DUR[id]}); giveTool(uid); return uid; }
function bestInst(kind) { let b = null; for (const t of S.toolInv) if (t.dur > 0 && TOOLI[t.id].kind === kind && (!b || TOOLI[t.id].price > TOOLI[b.id].price)) b = t; return b; }
function useTool(inst) {
  inst.dur--; dirty = true;
  { const mx = TOOL_DUR[inst.id]; if (inst.dur === Math.ceil(mx * .2)) toast(`⚠ ${TOOLI[inst.id].name}の耐久が残り${inst.dur}。鍛冶屋で安く修理できる`, 3500); }
  if (inst.dur <= 0) { inst.dur = 0; toast(`💥 ${TOOLI[inst.id].name}が壊れた……使えないが、無くなりはしない。鍛冶屋ガルドで修理できる。`, 4000); sfx('break'); syncBag(); renderHot(); }
}
function syncBag() {
  if (!S.bag || S.bag.length !== BAG_N) { const b = Array(BAG_N).fill(null); (S.bag || []).slice(0, BAG_N).forEach((x, i) => b[i] = x); S.bag = b; }
  S.bag = S.bag.map(sl => !sl ? null : sl.k === 't' ? (toolInst(sl.uid) ? sl : null) : (sl.n > 0 ? sl : null));
  if (!(S.sel >= 0 && S.sel < 8)) S.sel = 0;
  renderHot();
}
function slotIcon(sl, px) {
  if (!sl) return '';
  if (sl.k === 't') { const t = toolInst(sl.uid), tl = TOOLI[t.id], r = t.dur / TOOL_DUR[t.id];
    return icHTML(tl.icon, px, 'atlas', null, 't:' + tl.id) + `<div class="db"><i style="width:${r * 100}%;background:${r > .5 ? '#6ac86a' : r > .2 ? '#e8b858' : '#d8503a'}"></i></div>`; }
  if (sl.k === 'd') return dishIcHTML(sl.key, px, sl.g) + `<span class="n">${sl.n}</span>`;
  if (sl.k === 's') return icHTML(ING[INGI[sl.id]].icon, px, 'atlas', null, 's:' + sl.id) + `<span class="n">${sl.n}</span><span class="sd">種</span>`;
  return ingIc(sl.id, px, sl.g, true) + `<span class="n">${sl.n}</span>` + (sl.k === 's' ? '<span class="sd">種</span>' : '');
}
function renderHot() {
  const el = $('hot'); if (!el || !IMG.atlas || !S.bag) return;
  const html = S.bag.slice(0, 8).map((sl, i) => `<div class="hs ${i === S.sel ? 'on' : ''}" data-i="${i}" data-drop="bag:${i}" ${sl ? `data-drag="bag:${i}"` : ''}>${sl ? slotIcon(sl, U * 11) : (i === S.sel ? '<div class="hand">✋</div>' : '')}</div>`).join('');
  if (el._h === html) { if (modalOpen === 'inv') refreshInvPanel(); return; }
  el._h = html; el.innerHTML = html;
  el.querySelectorAll('.hs').forEach(d => d.onclick = () => {
    S.sel = +d.dataset.i; renderHot(); updPrompt(); const h = heldItem(); sfx('tick');
    if (!h) return;
    if (h.t === 'tool') { const t = toolInst(h.uid); toast(`${TOOLI[t.id].name}を持った（耐久 ${t.dur}/${TOOL_DUR[t.id]}）`, 1500); }
    else if (h.t === 'seed') toast(`${ingLabel(h.id)}の種を持った。空いた区画をタップで植える`, 1500);
  });
  if (modalOpen === 'inv') refreshInvPanel();
}
const bestTool = kind => { const b = bestInst(kind); return b ? TOOLI[b.id] : null; };
const syncHot = syncBag;
function drawHeld() {
  const h = heldItem(); if (!h) return;
  const idx = h.t === 'tool' ? TOOLI[toolInst(h.uid).id].icon : h.t === 'dish' ? dishInfo(h.key).icon : ING[INGI[h.id]].icon;
  drawIcon(idx, player.x + (player.flip ? -9 : 2), player.y - 11, 8, 'world');
}
function waterPlots(i, tool) {
  const {fx, size} = plotGrp(i), idx = i - fx, row = Math.floor(idx / 4);
  let targets = tool.area >= 12 ? [...Array(size).keys()].map(k => fx + k) : tool.area >= 4 ? [0,1,2,3].map(k => fx + row * 4 + k) : [i];
  targets = targets.filter(j => plotOn(j) && S.plots[j].seed && !ready(S.plots[j]) && (S.plots[j].w || 0) < tool.mult);
  targets.forEach(j => S.plots[j].w = tool.mult); dirty = true; return targets;
}

let rep_ = {};
function step(dt, vis) {
  { const h0 = S.t % 1440; S.t += dt * (vis && !simulating && (h0 >= 1080 || h0 < 360) ? .5 : 1); }
  const gm = (evOn('spring') ? 1.3 : 1) * rsGrow(), rain = evOn('rain');
  const spN = [0, 4, 12, 24][S.fac.sprinkler || 0], spW = [0, 1.3, 1.5, 1.8][S.fac.sprinkler || 0];
  const soilM = (S.staff.farmer && perkN('farmer', 'soil') ? 1.08 : 1) * mrHelp('farm') * plcMul('farm') * medalMul('farm');
  soilRest(dt);
  for (const i of PIDX()) { const p = S.plots[i]; if (p.seed) { if (rain && !p.w) p.w = 1.3; if (i < spN && (p.w || 0) < spW) p.w = spW; p.g = (p.g || 0) + dt * (p.w || 1) * gm * (p.fz === 'fert1' ? 1.3 : 1) * growSeasonMul(p.seed) * soilM * soilGrow(p) * (brLv(p.seed) >= 1 ? 1.15 : 1); } }
  if (typeof caravanStep === 'function' && S.cara) caravanStep();
  if (S.mr && typeof mrDaily === 'function' && S.mr.day !== gday()) mrDaily();
  if (typeof v45Tick === 'function') v45Tick();
  if (typeof v48Tick === 'function') v48Tick();
  if (typeof hillStep === 'function') { hillUnl(); hillStep(dt, vis); }
  if (typeof twUnl === 'function') twUnl();
  if (soilOn() && !S.soilIntro && !simulating && (scene === 'farm' || scene === 'hill')) { S.soilIntro = 1; tut('m_soil'); }
  if (S.aucPre) aucPreStep();
  // ranch
  const hens = (S.fac.coop || 0) * 2, cows = S.fac.barn || 0;
  if (hens || cows) {
    if (S.staff.farmer && S.feed < 8) { for (const id of FEEDS) { if (S.feed >= 16) break; const n = Math.min(S.inv[id] || 0, 4); if (n) { add(S.inv, id, -n); S.feed += n * 2; } } }
    const prod = (kind, id, per, cnt) => {
      S.tm[kind] -= dt * cnt;
      while (S.tm[kind] <= 0) { S.tm[kind] += per; if (S.feed <= 0) { S.tm[kind] = Math.max(S.tm[kind], 5); break; }
        S.feed--; const af = S.aff[kind === 'egg' ? 'chicken' : 'cow'] || 0;
        const g = Math.random() < (.02 + af * .006) * luckMul(), n = 1 + (Math.random() < af * .02 ? 1 : 0);
        withQ(1 + Math.min(2, af / 25), () => { add(g ? S.invG : S.inv, id, g ? 1 : n); if (g && n > 1) add(S.inv, id, 1); }); S.known.i[id] = true;
        if (kind === 'egg') legRoll(.002, 'niji_tamago', '鶏小屋に、七色に光る卵があった。'); rep_.ranch = (rep_.ranch || 0) + n; if (vis && scene === 'farm') floatAt(kind === 'egg' ? 30 : 113, kind === 'egg' ? 290 : 296, (g ? '金色の' : '') + ingName(id) + ' +' + n, 'info'); }
    };
    if (hens) prod('egg', 'egg', 240, hens);
    if (cows) prod('milk', 'milk', 360, cows);
  }
  // 仕込み師：決めておいた加工法を、空きがあれば仕込む（20秒ごとに1件×人数）
  if (S.staff.brewer && unl('machines')) { S.tm.brew = (S.tm.brew === undefined ? 20 : S.tm.brew) - dt * eSum('brewer');
    let guard = 0; while (S.tm.brew <= 0 && guard++ < 50) { S.tm.brew += 20; if (brewStep()) { eXp('brewer'); rep_.brewed = (rep_.brewed || 0) + 1; } } }
  // machines
  for (const m of MACH) { const st = S.mach[m.id]; if (!st || !st.lv || !st.q || !st.q.length) continue;
    let left = dt * (1 + .3 * (st.lv - 1)) * (S.staff.brewer && perkN('brewer', 'night') ? 1.1 : 1);
    while (left > 0 && st.q.length) { const job = st.q[0], r = m.recipes[job.r]; const need = r.sec - (job.t || 0);
      if (left >= need) { left -= need; st.q.shift(); add(S.inv, r.out, r.n + (job.b && Math.random() < .12 ? 1 : 0)); S.known.i[r.out] = true; rep_.proc = (rep_.proc || 0) + r.n; if (vis && scene === 'interior' && SLOTS[m.slot]) floatAt(m.slot === 'B' || m.slot === 'C' ? 12 : 132, 90, ingName(r.out), 'info'); else if (vis && scene === 'outside' && m.slot[0] === 'W') floatAt(120, 200, ingName(r.out), 'info'); else if (vis && scene === 'interior' && m.slot === 'A') floatAt(10, 60, ingName(r.out), 'info'); }
      else { job.t = (job.t || 0) + left; left = 0; } } }
  ensureTrend(); ensureWeather();
  if (wxOn('rain') || wxOn('storm')) for (const i of PIDX()) { const p = S.plots[i]; if (p.seed && (p.w || 0) < 1.3) p.w = 1.3; }
  // forage respawn
  S.forageT -= dt;
  while (S.forageT <= 0) { S.forageT += 80; if (unl('forage')) spawnForage(); }
  // traps
  for (const loc of ['pond','beach']) { const tp = S.traps[loc]; if (!tp.n || !haveIng('bait')) continue;
    tp.t -= dt * tp.n * (wxOn('storm') ? 2 : 1);
    while (tp.t <= 0 && haveIng('bait')) { tp.t += 240; takeIng('bait', false, 1); const pool = loc === 'pond' ? [['shrimp',30],['catfish',10],['eel',5]] : [['crab',30],['asari',30],['shrimp',15],['scallop',10],['octopus',8]];
      const id = wpick(pool.map(([k, w]) => ({k, w}))).k; add(S.inv, id, 1); S.known.i[id] = true; rep_.trap = (rep_.trap || 0) + 1; } }
  // orchard
  S.trees.forEach((t, ti) => { if (!t || !treeOn(ti)) return; const g = ING[INGI[t.id]]; t.g = (t.g || 0) + dt * (wxOn('rain') ? 1.2 : 1);
    if (t.g >= 1200) { t.ft = (t.ft || 0) + dt; while (t.ft >= g.src[2]) { t.ft -= g.src[2]; t.fruit = Math.min(3, (t.fruit || 0) + 1); } } });
  if (S.staff.farmer) S.trees.forEach((t, ti) => { if (t && treeOn(ti) && t.fruit >= 3) { withQ(2, () => add(S.inv, t.id, t.fruit)); S.known.i[t.id] = true; rep_.fruit = (rep_.fruit || 0) + t.fruit; t.fruit = 0; } });
  // reservations (banquets)
  S.resvT -= dt;
  if (!S.resv && S.resvT <= 0 && unl('orders')) {
    const pool = Object.keys(S.known.r).map(Number); S.resvT = 1500 + Math.random() * 1200;
    if (pool.length >= 2) { const ri = pick(pool), n = 4 + Math.floor(Math.random() * 5); S.resv = {key:'r' + ri, n, due:S.t + 1440, reward:Math.round(dval('r' + ri) * n * 2.5), who:pick(['騎士団','魔女の集会','商人組合','港の漁師たち','貴族の晩餐会','鍛冶屋の打ち上げ'])};
      if (vis) toast(`🍷 宴会の予約が入った！ ${S.resv.who}：${REC[ri].name}×${n}（24時間以内に掲示板かレジで届ける）`, 5000); }
  }
  if (S.resv && S.t > S.resv.due) { if (vis) toast(`宴会「${S.resv.who}」に間に合わなかった……評判が下がった。`, 4000); S.rep = Math.max(0, S.rep - 6); S.resv = null; S.resvT = 1500; }
  // cooks
  const cp = 32 / (1 + .35 * (S.fac.hearth - 1));
  while (S.tm.cook.length < S.staff.cook) S.tm.cook.push(rnd(0, cp));
  for (let i = 0; i < S.staff.cook; i++) {
    S.tm.cook[i] -= dt * eSpd('cook', i) * 1.25;
    if (S.tm.cook[i] <= 0) { S.tm.cook[i] += cp; const r = staffCook(i); if (r) eXp('cook', i); if (r && S.fac.kitchen && Math.random() < .25 * S.fac.kitchen) staffCook(); if (r) { rep_.cooked = (rep_.cooked || 0) + 1; if (vis && scene === 'interior') floatAt(62, 140, r.name, 'info'); } }
  }
  // farmers
  while (S.tm.farmer.length < S.staff.farmer) S.tm.farmer.push(rnd(0, 6));
  for (let i = 0; i < S.staff.farmer; i++) {
    S.tm.farmer[i] -= dt * eSpd('farmer', i);
    if (S.tm.farmer[i] <= 0) {
      S.tm.farmer[i] += 6; eXp('farmer', i, .5); const fe = S.emp.farmer[i] || {}; farmQB = fe.p5 === 'season' ? .4 : 0;
      const PI = PIDX();
      let done = false;
      for (const j of PI) { if (done) break; if (ready(S.plots[j])) { const h = harvestPlot(j); if (h && fe.p10 === 'bumper' && Math.random() < .15) add(S.inv, h.g.id, 1); if (h && fe.master && Math.random() < .3) add(S.inv, h.g.id, 1); if (h) { rep_.harvested = (rep_.harvested || 0) + h.n; if (vis && scene === plotScene(j)) floatAt(PLOTS[j].x + 6, PLOTS[j].y, h.g.name + (h.gold ? '★' : '') + ' +' + h.n, 'info'); } done = true; } }
      staffBuying = true; { const wc = wishCrop(); for (const j of PI) { if (done) break; const p = S.plots[j]; if (p.seed) continue; if (wc && plantPlot(j, wc, S.auto.buy)) { done = true; break; } if (p.last) { const fp = farmerPick(p.last, p); if (plantPlot(j, fp, S.auto.buy) || (fp !== p.last && plantPlot(j, p.last, S.auto.buy))) done = true; } } } staffBuying = false;
      for (const j of PI) { if (done) break; const p = S.plots[j]; if (p.seed && !ready(p) && !p.w) { p.w = 1.3; done = true; } }
    }
  }
  // fishers
  if (S.staff.fisher) {
    S.tm.fisher -= dt * eSum('fisher') * (1 + .25 * S.fac.pond);
    while (S.tm.fisher <= 0) { S.tm.fisher += 50; eXp('fisher'); const f = staffFish(perkN('fisher', 'rare') ? 1.5 : 0); const g = Math.random() < .03 + (perkN('fisher', 'gold') ? .05 : 0); withQ(perkN('fisher', 'big') ? 2 : 1.5, () => add(g ? S.invG : S.inv, f.id, 1)); S.known.i[f.id] = true; rep_.fish = (rep_.fish || 0) + 1; if (vis && scene === 'farm') floatAt(40, 120, f.name + (g ? '★' : ''), 'info'); }
  }
  if (S.staff.miner && S.mine && S.mine.max) { S.tm.mine = (S.tm.mine === undefined ? 70 : S.tm.mine) - dt * eSum('miner');
    while (S.tm.mine <= 0) { S.tm.mine += 70; eXp('miner'); const L = LAYERS[layerOf(perkN('miner', 'deep') ? S.mine.max : 1 + Math.floor(Math.random() * S.mine.max))]; if (S.mineAim && S.mine.ever && S.mine.ever[S.mineAim] && Math.random() < .7) { const o = S.mineAim; add(S.inv, o, 1 + (perkN('miner', 'double') && Math.random() < .15 ? 1 : 0)); rep_.ore = (rep_.ore || 0) + 1; continue; } const ores = Object.entries(shallowMix(L, LAYERS.indexOf(L))).filter(([k]) => k !== 'stone').map(([k, w]) => ({k, w: w * (perkN('miner', 'gem') && ING[INGI[k]].src[0] === 'ore' && /amethyst|ruby|sapphire|emerald|diamond|moonstone|yasho|hoshikui/.test(k) ? 2 : 1)}));
      const o = wpick(ores).k; add(S.inv, o, 1 + (perkN('miner', 'double') && Math.random() < .15 ? 1 : 0)); S.known.i[o] = true; rep_.ore = (rep_.ore || 0) + 1; } }
  if (S.fac.bee) { S.tm.bee -= dt * S.fac.bee; while (S.tm.bee <= 0) { S.tm.bee += 150; add(S.inv, 'honey', 1); S.known.i.honey = true; } }
  // shop
  hoursStep(vis);
  if (isOpenNow()) restock();
  S.tm.cust -= dt; if (!isOpenNow()) S.tm.cust = Math.max(S.tm.cust, 4);
  while (S.tm.cust <= 0) {
    S.tm.cust += custInterval() * rnd(.6, 1.4);
    const avail = []; for (let i = 0; i < shelfCount(); i++) if (S.shelf[i].n > 0 && !S.shelf[i].draft) avail.push(i);
    if (!avail.length) continue;
    const reg = rollRegular(), kind = reg ? reg.k : pickCustomer(), ct = CUSTT[kind], fav = reg ? reg.pref : Math.floor(Math.random() * 5);
    const wl = avail.map(i => { const s = S.shelf[i]; return {i, w: 1 + dishTaste(s.key)[fav] * (reg ? .9 : .4) + (demandMatch(s.key) ? 1.5 : 0) + (reg && dishInfo(s.key).name === reg.fav ? 4 : 0)}; });
    const i = wpick(wl).i, s = S.shelf[i], dm = demandMatch(s.key);
    const wb = S.shelfWare && S.shelfWare[i] ? (WARES.find(w => w.id === S.shelfWare[i]) || {bonus:0}).bonus : 0;
    const v = dval(s.key, s.g) * outfitValMul() * ct.b * (dm ? 1.25 * (perkOn('ryuka') ? 1.1 : 1) : 1) * (S.fac.terrace && inSeasonDish(s.key) ? 1 + .12 * S.fac.terrace : 1) * (S.fac.courtyard && !isNightHm() && !wxOn('rain') && !wxOn('storm') && dishInfo(s.key).ings.some(id => ING[INGI[id]].src[0] === 'seed') ? 1 + .1 * S.fac.courtyard : 1) * decorValMul(s.key, s.g) * ((S.fac.bar || 0) >= 2 && isNightHm() && ['焼く', '揚げる'].includes(dishInfo(s.key).method) ? 1.15 : 1) * (1 + dishTaste(s.key)[fav] * .03) * (1 + wb), re = reaction(s.price, v);
    const buy = re !== 'no';
    nbRecord(s.key, s.g, Math.round(s.price / (ct.b * (dm ? 1.25 * (perkOn('ryuka') ? 1.1 : 1) : 1))), re);   // v0.52.3：客の種類と流行の分をならして記録
    { const rg = repGain({cheap:.6, fair:.3, pricey:-.4, no:-.8}[re]); S.rep = Math.max(0, Math.min(100, S.rep + (rg > 0 ? rg * repDim() * decorRep() * townRepMul() * (S.staff.clerk && perkN('clerk', 'idol') ? 1.2 : 1) : rg))); }
    if (buy && s.key[0] === 'c' && S.creative[s.key] && S.creative[s.key].ai) S.creative[s.key].sold = (S.creative[s.key].sold || 0) + 1;
    { const dy = dayTrack(); dy.cust++; if (buy) { dy.buy++; dy.earned += s.price; dy.dish[s.key] = (dy.dish[s.key] || 0) + 1; } }
    if (buy && isMonDish(s.key)) S.stat.monsold = (S.stat.monsold || 0) + 1;
    if (buy) { rivalTrack(s.key, s.price); S.gold += s.price; S.stat.sold++; S.stat.earned += s.price; s.n--; rep_.sold = (rep_.sold || 0) + 1; rep_.earned = (rep_.earned || 0) + s.price;
      if (S.staff.clerk && S.auto.sell && buy) eXp('clerk', null, .5);
      if (S.fac.upstairs && Math.random() < .12 * S.fac.upstairs + (S.staff.clerk && perkN('clerk', 'up') ? .08 : 0)) { const j = avail.find(k => k !== i && S.shelf[k].n > 0); if (j !== undefined) { const s2 = S.shelf[j]; if (s2.price <= dval(s2.key, s2.g) * 1.35 * ct.b) { S.gold += s2.price; S.stat.sold++; S.stat.earned += s2.price; s2.n--; dayTrack().extra++; dayTrack().earned += s2.price; rep_.sold++; rep_.earned += s2.price; if (vis && scene === 'interior') floatAt(72, 236, '追加注文 +' + fmt(s2.price) + 'G', 'info'); } } } }
    if (reg) regVisit(reg, s, re, vis);
    if (vis) { spawnCustVis({slot:i, buy, re, price:s.price, kind}); if (buy && scene === 'interior') sfx('coin'); }
    if (s.n <= 0) s.n = 0;
  }
  criticStep(vis); expStep(dt, vis); breedStep(dt, vis); nightStep(dt, vis); townMorning(); lotteryStep(); branchStep(dt); trainStep(vis); rivalStep(); celStep(); fameStep();
  // orders
  S.ordersT -= dt;
  if (unl('orders') && (S.ordersT <= 0 || S.orders.length < 3)) { if (S.ordersT <= 0) S.ordersT = 300; refillOrders(); }
  dirty = true;
}
async function simulateAsync(sec, prog) {   // 放置の計算を少しずつ進め、画面を止めない
  rep_ = {}; const g0 = S.gold; simulating = true; const tot = Math.min(sec, OFFLINE_CAP); let left = tot, k = 0;
  try { while (left > 0) { const d = Math.min(2, left); step(d, false); left -= d; if (++k % 300 === 0) { if (prog) prog(1 - left / tot); bootT = Date.now(); await new Promise(r => setTimeout(r, 0)); } } }
  finally { simulating = false; }
  const r = rep_; r.gold = S.gold - g0; r.sec = tot; return r;
}
function simulate(sec) {
  rep_ = {}; const g0 = S.gold; simulating = true;
  let left = Math.min(sec, OFFLINE_CAP);
  while (left > 0) { const d = Math.min(2, left); step(d, false); left -= d; }
  simulating = false; const r = rep_; r.gold = S.gold - g0; r.sec = Math.min(sec, OFFLINE_CAP); return r;
}
// v0.50：いま手に入る材料で作れる料理だけを依頼に出す
function ingObtainable(id) {   // いまの進み具合で手に入る食材か（話が進んでから手に入る食材は false）
  const g = ING[INGI[id]]; if (!g) return false; const k = g.src[0], a = g.src[1];
  if (haveIng(id) >= 2) return true;
  switch (k) {
    case 'market': case 'seed': case 'item': return true;
    case 'pier': case 'pond': case 'lake': case 'nushi': return unl('fishing');
    case 'forage': { const b = BIOS.find(x => x.zones.includes(a)); return unl('forage') && (!b || b.sc === 'wilds' || !b.cond || b.cond()); }
    case 'tree': return unl('ranch');
    case 'proc': return unl('machines');
    case 'mine': case 'ore': return unl('mine') && (mineState().max || 0) >= Math.max(0, ((+a || 1) - 1) * 10);
    case 'merchant': return unl('merchant');
    case 'night': return unl('night');
    case 'cellar': return unl('cellar');
    case 'deep': return unl('abyss');
    case 'town': return townOpen(a);
    case 'dungeon': return DGD[a] ? dgOpen(a) : unl('dungeon');
    case 'mregg': return unl('mranch');
    case 'herb': case 'potion': return unl('herb');
    case 'tmap': return unl('tmap');
    case 'mfarm': return unl('mirror');
    case 'hill': return unl('hill');
    default: return false;   // 伝説の食材などは、手に入れるまで秘密
  }
}
const recMakeable = ri => REC[ri].ings.every(ingObtainable);
function refillOrders() {
  const known = Object.keys(S.known.r).map(Number).filter(recMakeable);
  const starter = ['焼きトマト', '目玉焼き', '白ごはん', 'ゆで卵', '冷やしトマト', 'アジの塩焼き', 'サバの塩焼き'].map(n => REC.findIndex(r => r.name === n)).filter(i => i >= 0 && recMakeable(i));
  const easy = REC.map((r, i) => i).filter(i => REC[i].ings.length <= 3 && !SECRET_R.has(i) && recMakeable(i) && REC[i].value <= 60 + 15 * Object.keys(S.known.r).length);
  let g = 0;
  while (S.orders.length < 3 && g++ < 40) {
    const pool = known.length >= 3 && Math.random() < .75 ? known : (starter.length && known.length < 3 ? starter : easy.length ? easy : known);
    if (!pool.length) break;
    const ri = pick(pool), n = 1 + Math.floor(Math.random() * (known.length < 3 ? 2 : 3));
    if (S.orders.some(o => o.ri === ri)) continue;
    S.orders.push({ri, n, reward: Math.round(REC[ri].value * n * 2), who: pick(RESIDENTS).name});
  }
}
// 依頼の料理の名前とヒント（作ったことがない料理は、名前・調理法・材料の数・材料1つ）
function recHint(ri) {
  const r = REC[ri], kn = S.known.r[ri] || S.learned[ri];
  if (kn) return `${r.method}：${r.ings.map(ingName).join('・')}`;
  const shown = r.ings[0];
  return `${r.method}・材料${r.ings.length}つ：${ingName(shown)}${r.ings.length > 1 ? '＋' + Array(r.ings.length - 1).fill('？').join('＋') : ''}`;
}
function deliverOrder(i, re) {
  const o = S.orders[i]; if (!o || haveDish('r' + o.ri) < o.n) return false;
  takeDish('r' + o.ri, false, o.n); sfx('coin'); S.stat.orders = (S.stat.orders || 0) + 1; dayTrack().orders++; S.gold += o.reward; S.rep = Math.min(100, S.rep + 2 * repDim()); S.orders.splice(i, 1);
  toast(`📜 依頼達成！ ${o.who}に届けて ${fmt(o.reward)}G を受け取った。`); dirty = true; if (re) re(); return true;
}
// ====================================================== rendering
let tNow = 0, camY = 0;
const bgImg = () => scene === 'guild' ? IMG['bg_guild' + guildStage()] : scene === 'mine' ? (FL && FL.arena ? IMG.bg_arena : FL && FL.vault ? IMG.bg_vault : FL && FL.ak ? IMG.bg_ancient : FL && FL.dg === 'tower' ? IMG[(FL.boss ? 'bg_twb' : 'bg_tw') + twBand(Math.min(30, FL.f))] : FL && FL.dg ? IMG[(FL.boss ? 'bg_dgb_' : 'bg_dg_') + FL.dg] : FL && FL.v ? IMG['bg_deep_' + FL.v] : IMG['bg_mine' + layerOf(FL ? FL.f : 1)]) : scene === 'farm' ? IMG[S.fac.orchard ? (S.fac.greenhouse ? 'bg_farm4' : 'bg_farm3') : (S.fac.greenhouse ? 'bg_farm2' : 'bg_farm')] : IMG['bg_' + scene];
const sceneH = () => bgImg().height;
let VIEW_BOTTOM = 224; const VIEW_TOP = 30, OFF = 14; // world y16 -> screen row 30
function drawChar(k, x, y, flip = false, seated = false, world = true) {
  let im = world ? IMG.chars : IMG.charsUI, i = CH[k];
  const bob = 0;
  const h = seated ? 13 : 18;
  if (world && (k === 'player' || k === 'cook' || k === 'clerk') && typeof tintedChar === 'function') { const cv = tintedChar(k); if (cv) { im = cv; i = 0; } }
  if (flip) { ctx.save(); ctx.translate(Math.round(x), 0); ctx.scale(-1, 1); ctx.drawImage(im, i * 16, 0, 16, h, -8, Math.round(y) - 18 + bob, 16, h); ctx.restore(); }
  else ctx.drawImage(im, i * 16, 0, 16, h, Math.round(x) - 8, Math.round(y) - 18 + bob, 16, h);
}
function drawIcon(idx, x, y, sz, kind = 'world') {
  const im = IMG[kind]; ctx.drawImage(im, (idx % COLS) * 32, Math.floor(idx / COLS) * 32, 32, 32, Math.round(x), Math.round(y), sz, sz);
}
function drawDish(key, g, x, y, sz) {
  const d = dishInfo(key); drawIcon(d.icon, x, y, sz, g ? 'gold' : 'world');
  if (d.over != null) drawIcon(d.over, x + sz * .22, y + sz * .08, Math.round(sz * .55), g ? 'gold' : 'world');
}
function miniLock(x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#c8a050'; ctx.fillRect(x + 1, y, 3, 1); ctx.fillRect(x, y + 1, 1, 2); ctx.fillRect(x + 4, y + 1, 1, 2);
  ctx.fillStyle = '#a07a3a'; ctx.fillRect(x - 1, y + 3, 7, 5); ctx.fillStyle = '#2a1a10'; ctx.fillRect(x + 2, y + 4, 1, 2);
}
function lockArea(x0, y0, x1, y1, big = false, icon = true) {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.fillStyle = 'rgba(8,5,10,.6)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = 'rgba(150,60,45,.45)'; ctx.lineWidth = 1;
  for (let k = -(y1 - y0); k < x1 - x0; k += 4) { ctx.beginPath(); ctx.moveTo(x0 + k + .5, y1); ctx.lineTo(x0 + k + (y1 - y0) + .5, y0); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(200,80,60,.75)'; ctx.strokeRect(x0 + .5, y0 + .5, x1 - x0 - 1, y1 - y0 - 1);
  if (!icon) return;
  if (big) drawChar('lock', (x0 + x1) / 2, (y0 + y1) / 2 + 8); else miniLock((x0 + x1) / 2 - 2, (y0 + y1) / 2 - 4);
}
let hudRows = VIEW_TOP;
function measureHud() { const st = $('strip'), rt = $('root'); if (!st || !rt) return; const b = (st.getBoundingClientRect().bottom - rt.getBoundingClientRect().top) / U; if (b > 0 && b < 120) hudRows = Math.max(VIEW_TOP, Math.ceil(b)); }
function updCam(snap) {
  const H = sceneH(), minY = -(hudRows - OFF), maxY = Math.max(minY, H - (VIEW_BOTTOM - OFF));
  const mid = (hudRows + VIEW_BOTTOM) / 2 - OFF;
  const tgt = Math.max(minY, Math.min(maxY, player.y - mid + 6));
  camY = snap ? tgt : camY + (tgt - camY) * .12;
}
function drawPlotCrop(i) { const p = PLOTS[i];
      const s = S.plots[i];
      if (soilOn()) { const lv = soilLv(soilV(s));   // 土の色：肥えた土は黒く湿って、やせた土は白っぽくひび割れる
        if (lv === 3) { ctx.fillStyle = 'rgba(8,4,2,.38)'; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = '#4a6a2a'; ctx.fillRect(p.x + 2, p.y + p.h - 2, 1, 1); ctx.fillRect(p.x + p.w - 3, p.y + 3, 1, 1); }
        else if (lv <= 1) { ctx.fillStyle = lv === 0 ? 'rgba(215,185,135,.42)' : 'rgba(205,175,125,.24)'; ctx.fillRect(p.x, p.y, p.w, p.h);
          if (lv === 0) { ctx.fillStyle = 'rgba(60,40,20,.7)'; ctx.fillRect(p.x + 3, p.y + 4, 3, 1); ctx.fillRect(p.x + 5, p.y + 5, 1, 2); ctx.fillRect(p.x + 7, p.y + 9, 3, 1); } } }
      if (!s.seed) return;
      const g = ING[INGI[s.seed]], pr = Math.min(1, (s.g || 0) / g.src[2]);
      if (s.w && pr < 1) { ctx.fillStyle = 'rgba(20,30,60,.45)'; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = '#6a9ad8'; ctx.fillRect(p.x + 1, p.y + 1, 1, 1); }
      if (s.fz && s.fz !== 'used3') { ctx.fillStyle = {fert1:'#8a6a3a', fert2:'#e8b858', fert3:'#9ad0e8'}[s.fz]; ctx.fillRect(p.x + p.w - 2, p.y + 1, 1, 1); ctx.fillRect(p.x + p.w - 3, p.y + 2, 1, 1); }
      if (pr >= 1) {
        drawChar('bush2', p.x + 6, p.y + 15);
        drawIcon(g.icon, p.x + 1, p.y - 3 + Math.sin(tNow * 3 + i) * .6, 10);
        if (Math.sin(tNow * 4 + i * 1.7) > .6) { ctx.fillStyle = '#fffbd0'; ctx.fillRect(p.x + 10, p.y - 2, 1, 1); ctx.fillRect(p.x + 9, p.y - 1, 3, 1); ctx.fillRect(p.x + 10, p.y, 1, 1); }
      } else {
        drawChar(pr < .33 ? 'bush0' : pr < .7 ? 'bush1' : 'bush2', p.x + 6, p.y + 15);
        ctx.fillStyle = '#140c08'; ctx.fillRect(p.x, p.y + p.h - 1, p.w, 2); ctx.fillStyle = '#8aa05a'; ctx.fillRect(p.x, p.y + p.h - 1, Math.round(p.w * pr), 1);
      }
}
function render(dt) {
  const bg = bgImg();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 144, LH);
  ctx.setTransform(1, 0, 0, 1, 0, OFF - Math.round(camY));
  ctx.drawImage(bg, 0, 0);
  const list = [];
  if (scene === 'farm') {
    const n = plotCount();
    PLOTS.slice(0, 24).forEach((p, i) => {
      if (i >= n) { lockArea(p.x - 1, p.y - 1, p.x + p.w + 1, p.y + p.h + 1, false, i === n || i % 4 === 0); return; }
      drawPlotCrop(i);
    });
  }
  if (scene === 'farm') {
    if (!S.fac.bee) lockArea(87, 145, 104, 163);
    if (!S.fac.greenhouse) lockArea(5, 168, 64, 216, true);
    if (!S.fac.orchard) lockArea(81, 168, 140, 216, true);
    else S.trees.slice(0, 4).forEach((t, i) => { const [x, y] = TREEPOS[i]; if (!t) return; const st = t.g >= 1200 ? 2 : t.g >= 400 ? 1 : 0; drawChar('tree' + st, x, y + 4);
      for (let k = 0; k < (t.fruit || 0); k++) drawIcon(ING[INGI[t.id]].icon, x - 6 + k * 4, y - 12 + (k % 2) * 3, 6); });
    for (let i = 0; i < S.traps.pond.n; i++) drawChar('trap', 44 + i * 6, 152);
  }
  if (scene === 'outside') {
    if (merchantHere()) { ctx.drawImage(IMG.wagon, 100, 262); drawChar('traveler', 95, 292); }
    if (!unl('stall')) lockArea(10, 250, 46, 286);
    if (S.fac.workshop) ctx.drawImage(IMG.workshop, 101, 202); else lockArea(103, 205, 140, 234, true); drawTowerFar(); if (unl('guild') && IMG.guild_sign) ctx.drawImage(unl('mranch') && IMG.guild_sign2 ? IMG.guild_sign2 : IMG.guild_sign, 116, 248); if (unl('town')) drawTown(); drawRival(); drawForgeHut(); drawFukuStall(); }
  if (scene === 'farm') drawCourtyard();
  if (scene === 'farm') { if (!S.fac.coop) { lockArea(4, 244, 47, 284, true); lockArea(4, 288, 61, 344); } if (!S.fac.barn) { lockArea(86, 244, 141, 288, true); lockArea(86, 296, 141, 344); }
    if (S.feed <= 0 && (S.fac.coop || S.fac.barn) && Math.sin(tNow * 4) > 0) { ctx.fillStyle = '#d8503a'; ctx.fillRect(71, 300, 2, 4); ctx.fillRect(71, 305, 2, 1); } }
  if (scene === 'upstairs') drawUpstairs();
  if (scene === 'cellar') drawCellar();
  if (scene === 'wilds') drawWilds();
  if (isBio()) drawBio();
  if (scene === 'interior') {
    drawDecor(); ctx.drawImage(IMG.bed, 98, 112);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(98, 112, 22, 16); ctx.fillStyle = '#5a3a22'; ctx.fillRect(99, 113, 20, 14); ctx.fillStyle = '#d8d0c0'; ctx.fillRect(100, 114, 6, 4); ctx.fillStyle = '#7a2a2a'; ctx.fillRect(100, 118, 18, 8); ctx.fillStyle = '#9a3a3a'; ctx.fillRect(100, 118, 18, 1);
    if (S.fac.upstairs) ctx.drawImage(IMG.stairs, 21, 300);
    drawTrapdoor();
    if (!(S.mach.brew && S.mach.brew.lv)) lockArea(0, 42, 20, 66);
    MACH.forEach((m, mi) => { const r = SLOTS[m.slot], st = S.mach[m.id]; if (!r) return;
      if (st && st.lv) { ctx.drawImage(IMG.machines, mi * 20, 0, 20, 24, r[0], r[1], 20, 24); if (st.q && st.q.length) { const job = st.q[0], rr = m.recipes[job.r]; ctx.fillStyle = '#140c08'; ctx.fillRect(r[0] + 2, r[3] - 3, 16, 2); ctx.fillStyle = '#8ad08a'; ctx.fillRect(r[0] + 2, r[3] - 3, Math.round(16 * (job.t || 0) / rr.sec), 2); if (Math.random() < .2) { ctx.fillStyle = 'rgba(220,220,230,.5)'; ctx.fillRect(r[0] + 6 + Math.random() * 8 | 0, r[1] - 2 + Math.random() * 3 | 0, 1, 1); } } }
      else lockArea(r[0] + 1, r[1] + 1, r[2] - 1, r[3] - 1); });
    // shelf dishes
    for (let i = 0; i < 5; i++) {
      const x = SHELF_X(i);
      if (i >= shelfCount()) { lockArea(x - 1, 154, x + 12, 172); continue; }
      const s = S.shelf[i]; if (!s.n) continue;
      drawDish(s.key, s.g, x, SHELF_Y, 11);
      ctx.fillStyle = '#c8bea8'; ctx.fillRect(x + 2, 168, 7, 3); ctx.fillStyle = '#3a2a1a'; for (let k = 0; k < Math.min(5, s.n); k++) ctx.fillRect(x + 3 + k, 169, 1, 1);
    }
    // pass window dishes (stock preview)
    const ks = Object.keys(S.dish).slice(0, 3);
    ks.forEach((k, i) => drawDish(k, false, 44 + i * 14, 139, 10));
    // hearth flicker
    for (let i = 0; i < 6; i++) { const fx = 101 + Math.random() * 14, fy = 38 + Math.random() * 9; ctx.fillStyle = Math.random() < .5 ? 'rgba(255,200,90,.7)' : 'rgba(255,120,40,.6)'; ctx.fillRect(fx | 0, fy | 0, 1, 1); }
    if (Math.random() < .3) { ctx.fillStyle = 'rgba(160,150,160,.35)'; ctx.fillRect(105 + Math.random() * 6 | 0, 22 + Math.random() * 6 | 0, 1, 1); }
    custVis.forEach(c => list.push({y: c.phase === 'eat' ? c.y - 1 : c.y, f: () => {
      if (c.ev && c.ev.ghost) { ctx.globalAlpha = .55 + .1 * Math.sin(tNow * 3); } drawChar(c.k, c.x, c.y, c.flip, c.phase === 'eat'); ctx.globalAlpha = 1;
      if (c.phase === 'eat' && c.ev) drawDish(S.shelf[c.ev.slot] && S.shelf[c.ev.slot].key ? S.shelf[c.ev.slot].key : 'r0', false, c.x - 5, c.y + 1, 10);
      if (c.phase === 'react') drawFace(c.x, c.y - 25, c.ev.re);
    }}));
  }
  actors.forEach(a => list.push({y: a.y, f: () => drawChar(a.k, a.x, a.y, a.flip)}));
  if (scene === 'mine') list.push(...drawMine());
  if (scene === 'mranch') list.push(...drawMRanch());
  if (scene === 'museum') list.push(...drawMuseum());
  if (scene === 'tavern') list.push(...drawTavern());
  if (scene === 'hill') list.push(...drawHill());
  if (scene === 'oldtown') list.push(...drawOldtown());
  if (scene === 'mfarm') list.push(...drawMFarm());
  if (scene === 'outside' && nrN()) list.push({y:-998, f:drawNoren});
  if (scene === 'outside' && c100()) list.push({y:-999, f:drawGoldShop});
  if (scene !== 'mine') list.push(...v41Draw(), ...plcDraw());
  if (scene !== 'mine') occDraw(list, bg);
  list.push({y: player.y, f: () => { if (hurtT > 0) { hurtT -= dt; if ((tNow * 20 | 0) % 2) return; } drawChar('player', player.x, player.y, player.flip); drawWeaponSwing(); }});
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  drawHeld();
  if ((scene === 'outside' || scene === 'farm' || scene === 'hill' || scene === 'wilds' || (isBio() && !['b_snow', 'b_moon'].includes(scene))) && S.weather) {
    const k = S.weather.k, top = camY - 20;
    if (k === 'rain' || k === 'storm') { ctx.strokeStyle = k === 'storm' ? 'rgba(170,190,230,.55)' : 'rgba(150,170,210,.4)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < (k === 'storm' ? 70 : 40); i++) { const x = (i * 37 + tNow * 90) % 160 - 8, y = top + ((i * 53 + tNow * 220) % 280); ctx.moveTo(x | 0, y | 0); ctx.lineTo((x - 2) | 0, (y + 5) | 0); } ctx.stroke();
      if (k === 'storm' && Math.sin(tNow * 1.3) > .995) { ctx.fillStyle = 'rgba(220,230,255,.35)'; ctx.fillRect(0, top, 144, 300); } }
    if (k === 'fog') { for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(160,170,190,.07)'; ctx.fillRect(((i * 40 + tNow * 6) % 200) - 40, top + 40 + i * 40, 90, 22); } }
  }
  drawNight(); drawBioTop(); drawAbyssTop();
  if (tapFx) { ctx.strokeStyle = `rgba(232,184,88,${tapFx.t})`; ctx.strokeRect(tapFx.x - 3 * (2 - tapFx.t), tapFx.y - 1.5 * (2 - tapFx.t), 6 * (2 - tapFx.t), 3 * (2 - tapFx.t)); tapFx.t -= dt * 2; if (tapFx.t <= 0) tapFx = null; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function drawFace(x, y, re) {
  x = Math.round(x) - 7; y = Math.round(y);
  ctx.drawImage(IMG.chars, CH.bubble * 16, 2, 16, 16, x, y, 16, 16);
  const col = {cheap:'#3a8a4a', fair:'#4a6a8a', pricey:'#a07a2a', no:'#a02a2a'}[re];
  ctx.fillStyle = col; ctx.fillRect(x + 3, y + 1, 10, 9);
  ctx.fillStyle = '#f0e8d0';
  ctx.fillRect(x + 5, y + 3, 1, 2); ctx.fillRect(x + 10, y + 3, 1, 2);
  if (re === 'cheap') { ctx.fillRect(x + 5, y + 6, 6, 1); ctx.fillRect(x + 6, y + 7, 4, 1); }
  else if (re === 'fair') { ctx.fillRect(x + 6, y + 7, 4, 1); }
  else if (re === 'pricey') { ctx.fillRect(x + 6, y + 7, 4, 1); ctx.fillRect(x + 9, y + 2, 2, 1); }
  else { ctx.fillRect(x + 6, y + 6, 4, 1); ctx.fillRect(x + 5, y + 7, 1, 1); ctx.fillRect(x + 10, y + 7, 1, 1); }
}

// ====================================================== UI basics
function toast(msg, ms = 2600) {
  if (typeof tlogPush === 'function') tlogPush(msg); ms *= (typeof uiToastMul === 'function' ? uiToastMul() : 1);
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg; $('toast').appendChild(t);
  while ($('toast').children.length > 2) $('toast').firstChild.remove();
  setTimeout(() => t.remove(), ms);
}
function floatAt(x, y, txt, cls = '') {
  const e = document.createElement('div'); e.className = 'float ' + cls; e.textContent = txt;
  e.style.left = x * U + 'px'; e.style.top = (y + OFF - camY) * U + 'px'; $('root').appendChild(e); setTimeout(() => e.remove(), 1400);
}
let modalOpen = null, onClose = null;
// v0.61 画面を作り直しても、ほかの画面から戻っても、スクロールの位置を覚えておく（閉じると忘れる）
const mScroll = {};
function modal(title, html, key = 'x', closeCb = null) {
  setTimeout(() => tut('m_' + key), 50);
  const mb = $('mbody'), shown = $('modal').classList.contains('show');
  const sig = () => [...mb.querySelectorAll('.seg .on')].map(e => e.textContent).join('|');
  if (shown && modalOpen) mScroll[modalOpen + '|' + $('mtitle').textContent] = {y:mb.scrollTop, sig:sig()};
  $('mtitle').textContent = title; mb.innerHTML = html; $('modal').classList.add('show'); modalOpen = key; onClose = closeCb;
  const m = shown && mScroll[key + '|' + title]; mb.scrollTop = m && m.sig === sig() ? m.y : 0;   // タブを切り替えた時はいちばん上から
  setTabs();
}
function closeModal() { for (const k in mScroll) delete mScroll[k]; hideTip(); $('modal').classList.remove('show'); const cb = onClose; modalOpen = null; onClose = null; if (cb) cb(); setTabs(); }
$('mclose').onclick = closeModal;
function bind(sel, fn) { $('mbody').querySelectorAll(sel).forEach(el => el.onclick = e => { e.stopPropagation(); fn(el.dataset, el); }); }

const TABS = [
  {k:'inv', n:'カバン', ic:() => icHTML(INGI.tomato, U * 6.5)},
  {k:'rec', n:'レシピ', ic:() => icHTML(REC[48].icon, U * 6.5)},
  {k:'dex', n:'図鑑', ic:() => icHTML(INGI.moonshroom, U * 6.5)},
  {k:'fac', n:'施設', ic:() => icHTML(REC[40].icon, U * 6.5)},
  {k:'staff', n:'従業員', ic:() => charHTML('cook', U * 7)},
  {k:'cal', n:'暦', ic:() => `<div class="calic"><b></b><span>${S ? dayInMonth() : 1}</span></div>`},
  {k:'man', n:'説明書', ic:() => '<div class="manic"><i></i></div>'},
];
function setTabs() {
  $('tabs').innerHTML = TABS.map(t => `<div class="tab ${modalOpen === t.k ? 'on' : ''}" data-k="${t.k}"><div class="ti">${t.ic()}</div>${t.n}</div>`).join('');
  $('tabs').querySelectorAll('.tab').forEach(el => el.onclick = () => {
    const k = el.dataset.k; if (modalOpen === k) return closeModal();
    sfx('tick'); ({inv:openInv, rec:openRecipes, dex:openDex, fac:openFac, staff:openStaff, cal:openCal, man:openManual})[k]();
  });
}
let goalOpen = false;
$('goal').addEventListener('pointerdown', e => { e.stopPropagation(); if (scene === 'mine') return; goalOpen = !goalOpen; clearTimeout(goalT); if (goalOpen) goalT = setTimeout(() => { goalOpen = false; hud(); }, 6000); hud(); });
let goalT = 0;
$('goalx').addEventListener('pointerdown', e => { e.stopPropagation(); goalOpen = false; hud(); });
function applyPad() { const on = S.ui && S.ui.pad; $('pad').style.display = on ? 'grid' : 'none'; }
function hud() {
  $('goldv').textContent = fmt(S.gold);
  const day = Math.floor(S.t / 1440) + 1, hm = Math.floor(S.t % 1440);
  $('day').textContent = `${unl('season') ? SEASONS[seasonIdx()].i : ''}${monthName()} ${dayInMonth()}日(${WDN[weekDay() - 1]}) ${wx().i}`;
  $('time').textContent = `${String(Math.floor(hm / 60)).padStart(2, '0')}:${String(hm % 60).padStart(2, '0')}`;
  const rk = RANKS[rankIdx()];
  $('rep').textContent = (S.title && unl('ach') && (frame.n || 0) % 600 >= 300 ? '「' + S.title + '」' : rk.n + ' ' + (unl('fame') && S.fame ? '🌟名声Lv' + S.fame.lv : '★'.repeat(1 + Math.floor(S.rep / 25)) + '☆'.repeat(4 - Math.floor(S.rep / 25))));
  const ev = curEvent(), tr = trendText(), luck = S.luckT > S.t ? ' 🐈幸運' : '';
  const ph = (frame.n || 0) % 600, wt = wx().d ? `${wx().n}：${wx().d}` : '';
  $('trend').textContent = (ev && ph < 200 ? '行事：' + ev.n : wt && ph >= 400 ? wt : tr || wt) + luck + (S.luck3T > S.t ? ' ✨月光' : '');
  $('loc').textContent = scene === 'mine' && FL ? (FL.arena ? '闘技場' : FL.vault ? '隠し部屋' : FL.ak ? '古の厨房' : FL.dg ? (FL.boss ? '最奥' : FL.f + '階') : `B${FL.f}`) : SCENES[scene].short;
  const g = GOALS[S.goal];
  const rs = S.resv ? `🍷宴会 ${dishInfo(S.resv.key).name}×${S.resv.n}（あと${fmtLeft(S.resv.due - S.t)}）` : '';
  const gl = g ? `目標：${g.t}` : rs || '目標はすべて達成！';
  if (scene === 'mine' && FL) { const M = mineState(), b = (v, mx, c) => `<span style="position:relative;display:inline-block;width:${U * 26}px;height:${U * 4.2}px;background:#140c08;vertical-align:middle;margin:0 ${U * .8}px;border:1px solid #3a2a1e;border-radius:2px;overflow:hidden"><i style="display:block;height:100%;width:${Math.max(0, Math.min(100, v / mx * 100))}%;background:${c}"></i><b style="position:absolute;inset:0;text-align:center;line-height:${U * 4.2}px;font-size:${U * 3.4}px;color:#fff;text-shadow:0 0 2px #000,0 0 2px #000">${Math.max(0, Math.round(v))}/${Math.round(mx)}</b></span>`;
    const h = `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${FL.arena ? (FL.arena.boss ? '闘技場：ボスと再戦' : `闘技場 第${FL.arena.wave}波${FL.arena.mode ? '/' + FL.arena.mode : ''}`) : FL.vault ? '隠し部屋' : FL.ak ? '古の厨房' : FL.dg ? DGD[FL.dg].n : FL.v ? DEEP_VN[FL.v] : LAYERS[layerOf(FL.f)].n}　<span style="color:#e8c060">Lv${plSt().lv}</span>${FL.curse ? '🗿' + FL.curse : ''}${buffOn('atk') ? ' ⚔' : ''}${buffOn('mine') ? ' ⛏' : ''}${buffOn('def') ? ' 🛡' : ''}</div><div style="white-space:nowrap">体力${b(M.hp, M.hpMax, '#c83a3a')}気力${b(M.st, M.stMax, '#4ab05a')}</div>`;
    if ($('goal').dataset.h !== h) { $('goal').innerHTML = h; $('goal').dataset.h = h; $('goal').style.whiteSpace = 'normal'; } }
  else if ($('goal').dataset.h !== gl) { $('goal').textContent = gl + ' ▼'; $('goal').dataset.h = gl; $('goal').style.whiteSpace = ''; }
  if (goalOpen) {
    const h = (g ? `<b>目標：${g.t}</b><br>${g.h}（報酬 ${g.r}G）` : '<b>目標はすべて達成！</b>') + (rs ? `<br><br><b>${rs}</b><br>${S.resv.who}の宴会。掲示板かレジから届ける（報酬 ${fmt(S.resv.reward)}G）` : '') +
      (ev ? `<br><br><b>行事：${ev.n}</b><br>${ev.d}` : '') + (tr ? `<br><br><b>${tr}</b><br>流行りの料理はよく選ばれ、高めの値段でも買ってもらえる` : '');
    if ($('goalx').dataset.h !== h) { $('goalx').innerHTML = h; $('goalx').dataset.h = h; }
  }
  $('goalx').style.display = goalOpen && !modalOpen ? 'block' : 'none';
  const showPad = S.ui && S.ui.pad && !modalOpen; $('pad').style.visibility = showPad ? 'visible' : 'hidden';
}
const fmtLeft = sec => { sec = Math.max(0, sec); const m = Math.floor(sec / 60); return m >= 60 ? Math.floor(m / 60) + '時間' + (m % 60) + '分' : m + '分'; };
function chips() {
  let h = `<div class="chip" data-c="idle">💤放置</div>`;
  if (scene !== 'mine') { const n = todoList().length; h += `<div class="chip ${n ? 'grn' : ''}" data-c="todo">📋${n || ''}</div>`; }
  if (scene === 'interior') {
    h += canOpen() ? `<div class="chip grn" data-c="open">🔔開店する</div>` : isOpenNow() ? `<div class="chip grn" data-c="hours">営業中</div><div class="chip red" data-c="close">閉店する</div>` : `<div class="chip off" data-c="hours">閉店中</div>`;
    if (S.nightOpen) h += `<div class="chip blu" data-c="nightinfo">🌙裏営業中</div>${unl('dice') ? '<div class="chip grn" data-c="dice">🎲サイコロ</div>' : ''}<div class="chip red" data-c="nightend">終える</div>`; else if (canNight()) h += `<div class="chip blu" data-c="night">🌙裏営業</div>`;
    const can = S.staff.clerk > 0;
    h += `<div class="chip ${S.auto.sell && can ? 'grn' : 'off'}" data-c="sell">自動${S.auto.sell && can ? 'ON' : 'OFF'}</div>`;
    const mn = {strong:'強気▲', normal:'通常●', cheap:'安売り▼'}[S.auto.mode];
    h += `<div class="chip ${S.auto.mode === 'strong' ? 'red' : S.auto.mode === 'cheap' ? 'blu' : ''}" data-c="mode">${mn}</div>`;
  }
  { const hi = heldItem(); if (hi && hi.t === 'ing' && hi.id === 'moon_extract') h += `<div class="chip blu" data-c="moon">月光エキスを使う</div>`; }
  if (S.tmap && S.tmap.maps.length && unl('tmap') && scene !== 'mine') h += `<div class="chip" data-c="tmap">🗺地図${S.tmap.maps.length}</div>`;
  if (scene === 'mine') {
    if (skOn() && eqW()) { const sk = mineState().sk || 0; h += `<div class="chip ${sk >= 100 ? 'red' : 'off'}" data-c="skill">⚔技${sk >= 100 ? '！' : ' ' + Math.floor(sk) + '%'}</div>`; }
    h += `<div class="chip grn" data-c="eat">食べる</div>`; if (unl('herb') || MK_POTS.some(id => haveIng(id))) h += `<div class="chip" data-c="pot">🧪薬</div>`; if (haveIng('scroll')) h += `<div class="chip blu" data-c="scroll">巻物で帰る</div>`;
  } else if (scene === 'farm' || scene === 'hill') {
    const sp = scenePlots(scene), n = sp.filter(j => ready(S.plots[j])).length, e = sp.filter(j => !S.plots[j].seed).length;
    if (n) h += `<div class="chip grn" data-c="harv">全部収穫${n}</div>`;
    if (e) h += `<div class="chip" data-c="plantall">まとめ植え</div>`;
  }
  if (criticToday()) h += `<div class="chip red" data-c="critic">評論家が来る</div>`;
  if (contestOpen() && !contestTheme().done) h += `<div class="chip grn" data-c="contest">🏆コンテスト</div>`;
  if (S.buzzT > S.t) h += `<div class="chip blu" data-c="buzz">記事で話題</div>`;
  if ($('chips').dataset.h !== h) { $('chips').innerHTML = h; $('chips').dataset.h = h; }
}
$('chips').addEventListener('pointerup', e => { const el = e.target.closest('.chip'); if (!el) return; e.stopPropagation(); chipAct(el.dataset.c); });
$('chips').addEventListener('pointerdown', e => e.stopPropagation());
function chipAct(c) {
  if (c === 'idle') return openIdle();
  if (c === 'open') { openShop(false); return; }
  if (c === 'night') return openNight();
  if (c === 'dice') return openDice();
  if (c === 'nightend') { closeNight(true); chips(); return; }
  if (c === 'nightinfo') return toast(`裏営業中：深夜の客 ${S.night_ ? S.night_.cust : 0}人。1時50分に終わる。`);
  if (c === 'close') { if (chipAct._cl && Date.now() - chipAct._cl < 2500) { chipAct._cl = 0; closeShop(true); chips(); } else { chipAct._cl = Date.now(); toast('もう一度「閉店する」を押すと、今日の営業を終える（今日はもう開けられない）。', 2500); } return; }
  if (c === 'hours') return toast(isOpenNow() ? '営業中：18時に閉店し、その日の結果が出る。' : hmNow() >= CLOSE_H || hmNow() < 360 ? '閉店中：夜は眠る・地下迷宮・仕込みの時間。朝6時から開店できる。' : '本日の営業は終わった。');
  if (c === 'critic') return toast('今日、料理評論家が来店する。棚で一番価値の高い料理が採点される（品質・値付け・味・器・旬）。');
  if (c === 'contest') return openContest();
  if (c === 'buzz') return toast('評論家の記事が話題になり、客が1.3倍来ている。');
  if (c === 'sell') {
    if (!S.staff.clerk) return toast('自動販売には<b>店員</b>が必要です。「従業員」から雇えます。');
    if (S.auto.sell && !(window.__sellArm > Date.now())) { window.__sellArm = Date.now() + 2500; return toast('もう一度押すと<b>自動販売をOFF</b>にする（店員が棚に並べなくなる）', 2500); }
    window.__sellArm = 0; S.auto.sell = !S.auto.sell; toast(S.auto.sell ? '自動販売 ON：店員が料理を並べ、値段も決めます' : '自動販売 OFF：棚と値段は自分で管理。上の「自動OFF」を押すとONに戻る');
  } else if (c === 'mode') {
    S.auto.mode = {normal:'strong', strong:'cheap', cheap:'normal'}[S.auto.mode];
    toast({strong:'強気：単価は上がるが客は減り、評判も下がりやすい', normal:'通常：適正よりわずかに高め', cheap:'安売り：客と評判が増える'}[S.auto.mode]);
  } else if (c === 'harv') {
    let got = {};
    for (const i of scenePlots(scene === 'hill' ? 'hill' : 'farm')) if (ready(S.plots[i])) { const h = harvestPlot(i, true); got[h.g.name + (h.gold ? '★' : '')] = (got[h.g.name + (h.gold ? '★' : '')] || 0) + h.n; floatAt(PLOTS[i].x + 6, PLOTS[i].y, '+' + h.n, 'info'); }
    toast('収穫：' + Object.entries(got).map(([k, v]) => `${k}×${v}`).join('、'));
  } else if (c === 'plantall') openPlant(null, true);
  else if (c === 'eat') openEat();
  else if (c === 'pot') openPotUse();
  else if (c === 'todo') openTodo();
  else if (c === 'tmap') openTmList();
  else if (c === 'moon') { if (takeIng('moon_extract', false, 1)) { S.luck3T = S.t + 1800; sfx('ok'); syncBag(); toast('✨ 月光エキスを使った。30分間、金色の食材がとても出やすい。', 3500); } }
  else if (c === 'skill') { useSkill(); }
  else if (c === 'scroll') { if (takeIng('scroll', false, 1)) { closeModal(); scrollReturn(); } }
  dirty = true; chips();
}

// ====================================================== interactions
const root = $('root'); let tapFx = null;
cv.addEventListener('pointerdown', e => {
  if (busy || modalOpen) return;
  const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 144, sy = (e.clientY - r.top) / r.height * LH;
  if (goalOpen) { goalOpen = false; hud(); }
  if (sy < hudRows || sy > VIEW_BOTTOM) return;
  const y = sy - OFF + camY;
  if (isBio()) { bioSw = {pts:[[x, y]], moved:false, cx:e.clientX, cy:e.clientY, x0:x, y0:y}; return; }
  canvasTap(x, y);
});
function canvasTap(x, y) {
  tapFx = {x, y, t: 1};
  if (plcEd) return plcTap(x, y);
  // residents
  if (scene === 'outside') for (const a of actors) if (a.role === 'res' && Math.abs(a.x - x) < 7 && y > a.y - 18 && y < a.y + 2) return walkTo(a.x + (a.x > player.x ? -10 : 10), a.y, null);
  if (scene === 'mine' && FL) { const m = monAt(x, y); if (m) { attackAct(m); return; } const rk = rockAt(x, y); if (rk) { mineRockAct(rk); const p = standNear(rk); return walkTo(p[0], p[1], null); } player.mining = player.target = null; }
  if (scene === 'farm') for (const a of actors) if (a.role === 'animal' && Math.abs(a.x - x) < 9 && y > a.y - 14 && y < a.y + 3) return walkTo(a.x + (a.x > player.x ? -9 : 9), a.y, null);
  const objs = sceneObjs();
  for (const o of objs) if (x >= o.r[0] && x <= o.r[2] && y >= o.r[1] && y <= o.r[3]) return walkTo(o.st[0], o.st[1], o.plot != null ? o.act : () => { promptObj = o; });
  const [cx, cy] = clampWalk(scene, x, y); walkTo(cx, cy, null);
}
function walkTo(x, y, cb) {
  player.path = route(scene, player.x, player.y, x, y); player.onArrive = cb;
  const d = player.path.reduce((s, p, i) => s + Math.hypot(p[0] - (i ? player.path[i - 1][0] : player.x), p[1] - (i ? player.path[i - 1][1] : player.y)), 0);
  if (d < 2) { player.path = []; if (cb) cb(); player.onArrive = null; }
}
let padDir = null;
document.querySelectorAll('#pad [data-d]').forEach(el => {
  const on = e => { e.preventDefault(); e.stopPropagation(); const [dx, dy] = el.dataset.d.split(',').map(Number); padDir = {dx, dy, el}; el.classList.add('on'); player.path = []; player.onArrive = null; try { el.setPointerCapture(e.pointerId); } catch (_) {} };
  const off = e => { if (padDir && padDir.el === el) padDir = null; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
});

let promptObj = null;
const sceneObjs = () => scene === 'mine' ? mineObjs() : SCENES[scene].objs.filter(o => !o.cond || o.cond()).concat(typeof v41Objs === 'function' ? v41Objs() : []);
function nearestObj() {
  if (isBio()) { const f = S.forage.find(f => Math.hypot(f.x - player.x, f.y - player.y) < 12 && (bioOfScene(scene).zones.includes(f.z))); if (f) return {lb:`拾う：${ingLabel(f.id)}`, act:() => collectF(f), r:[f.x - 4, f.y - 8, f.x + 5, f.y + 1]}; }
  if (scene === 'outside') for (const a of actors) if (a.role === 'res' && Math.hypot(a.x - player.x, a.y - player.y) < 16) { const h = heldItem(), gift = h && h.t === 'ing' && (isOre(h.id) || (LIKES[RESIDENTS[a.res].k] || []).includes(h.id));
    return {lb:gift ? `${ingName(h.id)}を贈る：${RESIDENTS[a.res].name}` : a.res === 1 ? '話す・鍛冶：ガルド' : '話す：' + RESIDENTS[a.res].name, act:() => gift ? giveGift(a, h.id) : a.res === 1 ? openForge(a) : talk(a), res:a}; }
  if (scene === 'mine' && FL) { const m = FL.mons.find(m => Math.hypot(m.x - player.x, m.y - player.y) < 16); if (m) return {lb:`攻撃：${MONT[m.k].n}`, act:() => attackAct(m), res:m};
    const ob = mineObjs().find(o => rectDist(o.r, player.x, player.y - 4) < 10 || Math.hypot(o.st[0] - player.x, o.st[1] - player.y) < 9); if (ob) return ob;
    const rk = FL.rocks.find(o => Math.hypot(o.x + 8 - player.x, o.y + 7 - player.y) < 17); if (rk) return {lb:`掘る：${rk.k === 'stone' ? '岩' : ingName(rk.k)}`, act:() => mineRockAct(rk), r:[rk.x, rk.y, rk.x + 16, rk.y + 13]};
    return null; }
  if (scene === 'farm') for (const a of actors) if (a.role === 'animal' && Math.hypot(a.x - player.x, a.y - player.y) < 14) return {lb:(a.kind === 'cow' ? '牛' : 'ニワトリ') + 'をなでる', act:() => petAnimal(a), res:a};
  let best = null, bd = 1e9;
  for (const o of sceneObjs()) { const d = Math.min(rectDist(o.r, player.x, player.y - 4), Math.hypot(o.st[0] - player.x, o.st[1] - player.y)); if (d < bd) { bd = d; best = o; } }
  return best && bd < 11 ? best : null;
}
function treeLabel(i) { const t = S.trees[i]; if (!treeOn(i)) return i < 4 ? '🔒 果樹園' : '🔒 丘の農地'; if (!t) return '苗木を植える'; return t.fruit ? `${ingName(t.id)}を収穫（${t.fruit}）` : `${ingName(t.id)}の木`; }
function plotLabel(i) {
  if (!plotOn(i)) return i < 24 ? '🔒 畑の区画（施設で開放）' : '🔒 丘の農地（土地を買うと使える）';
  const p = S.plots[i], h = heldItem();
  const sl = soilOn() ? `（${SOIL_N[soilLv(soilV(p))]}${p.fam ? '・前は' + FAM_N[p.fam] : ''}）` : '';
  if (!p.seed) return (h && h.t === 'seed' ? `${ingLabel(h.id)}の種を植える${soilOn() && p.fam && cropFam(h.id) === p.fam ? '⚠連作' : ''}` : h && h.t === 'tool' && toolOf(h).kind === 'hoe' ? 'クワでまとめて植える' : '種を植える') + sl;
  if (ready(p)) return h && h.t === 'tool' && toolOf(h).kind === 'sickle' ? '鎌でまとめて収穫' : `${ingLabel(p.seed)}を収穫する`;
  if (h && h.t === 'ing' && FERTS.has(h.id) && !p.fz) return `${ingName(h.id)}をまく`;
  if (h && h.t === 'tool' && toolOf(h).kind === 'can' && !p.w) return '水をやる';
  return `${ingLabel(p.seed)}（育成中）`;
}
function updPrompt() {
  const moving = player.path.length || padDir;
  const o = moving ? null : nearestObj();
  const el = $('act');
  if (!o || modalOpen || busy) { el.style.display = 'none'; el.dataset.k = ''; return; }
  const mo = o.slot && MACH.find(m => m.slot === o.slot);
  const lk = {gh:!S.fac.greenhouse, bee:!S.fac.bee, brew:!(S.mach.brew && S.mach.brew.lv), orchard:!S.fac.orchard, dungeon:false, build:!S.fac.workshop, compost:!S.fac.compost, coop:!S.fac.coop, barn:!S.fac.barn}[o.id] || (mo && !(S.mach[mo.id] || {}).lv) || (/^shelf\d/.test(o.id || '') && +o.id.slice(5) >= shelfCount());
  const lb = o.plot != null ? plotLabel(o.plot) : o.tree != null ? treeLabel(o.tree) : (lk ? '🔒 ' : '') + (mo ? mo.name + (lk ? '（設置できる）' : 'を使う') : o.lb);
  if (el.dataset.k !== lb) { el.textContent = lb; el.dataset.k = lb; }
  el.style.display = 'flex'; el._o = o; placeAct();
}
function placeAct() {
  const el = $('act'), o = el._o; if (!o || el.style.display === 'none') return;
  let ax, top, bot;
  if (o.res) { ax = o.res.x; top = o.res.y - 19; bot = o.res.y; } else { ax = (o.r[0] + o.r[2]) / 2; top = o.r[1]; bot = o.r[3]; }
  const sT = (top + OFF - camY) * U, sB = (bot + OFF - camY) * U, w = el.offsetWidth, h = el.offsetHeight, RW = 144 * U;
  const below = sT - h - U * 3 < hudRows * U;
  el.classList.toggle('below', below);
  el.style.transform = below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
  el.style.top = (below ? Math.min(sB + U * 3, (VIEW_BOTTOM - 14) * U) : sT - U * 3) + 'px';
  el.style.left = Math.max(w / 2 + 4, Math.min(RW - w / 2 - 4, ax * U)) + 'px';
}
$('act').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const o = $('act')._o; if (o && !busy && !modalOpen) o.act(); });
function rectDist(r, x, y) { const dx = Math.max(r[0] - x, 0, x - r[2]), dy = Math.max(r[1] - y, 0, y - r[3]); return Math.hypot(dx, dy); }
function interact() {
  if (scene === 'outside') for (const a of actors) if (a.role === 'res' && Math.hypot(a.x - player.x, a.y - player.y) < 16) return talk(a);
  let best = null, bd = 1e9;
  for (const o of sceneObjs()) { const d = Math.min(rectDist(o.r, player.x, player.y - 4), Math.hypot(o.st[0] - player.x, o.st[1] - player.y)); if (d < bd) { bd = d; best = o; } }
  if (best && bd < 12) return best.act();
  toast('近くに調べられるものがない。');
}
function padMove(dt) {
  if (!padDir) return;
  const sp = 56 * dt, nx = player.x + padDir.dx * sp, ny = player.y + padDir.dy * sp;
  if (padDir.dx) player.flip = padDir.dx < 0;
  player.walk = true;
  if (walkable(scene, Math.round(nx), Math.round(ny))) { player.x = nx; player.y = ny; return; }
  // blocked: doors trigger when pushing into them
  for (const o of sceneObjs()) if (/^(door|back)$/.test(o.id) && Math.hypot(o.st[0] - player.x, o.st[1] - player.y) < 9) { padDir.el.classList.remove('on'); padDir = null; return o.act(); }
}
let busy = false;
function go(sc, x, y) {
  if (typeof plcEd !== 'undefined' && plcEd) { plcEd = null; plcBar(); }
  hideTip(); busy = true; sfx('door'); $('fade').style.opacity = 1;
  if (sc === 'guild') guildWalkRefresh();
  setTimeout(() => { scene = sc; player.x = x; player.y = y; player.path = []; S.pos = {scene, x, y}; promptObj = null; buildActors(); updCam(true); chips(); hud(); $('fade').style.opacity = 0; busy = false; tut('sc_' + sc); }, S.ui && S.ui.fast ? 110 : 260);
}
// 時間で通りの顔ぶれを入れかえる（ゲーム内10分ごと）
let resT = -1;
function resRefresh() { const k = Math.floor(hmNow() / 10); if (k === resT) return; resT = k;
  RESIDENTS.forEach((r, i) => { const a = actors.find(x => x.role === 'res' && x.res === i), here = resHere(r);
    if (here && !a) { const p = clampWalk('outside', pick([8, 136]), rnd(150, 200)); actors.push({k:r.k, role:'res', res:i, x:p[0], y:p[1], path:[], wait:0}); }
    if (!here && a) actors.splice(actors.indexOf(a), 1); }); }
function talk(a) {
  tut('m_res'); const r = RESIDENTS[a.res], day = Math.floor(S.t / 1440);
  let extra = '';
  if (S.friendDay[r.k] !== day) {
    S.friendDay[r.k] = day; S.friend[r.k] = (S.friend[r.k] || 0) + 1;
    if (r.gift && S.friend[r.k] % 3 !== 1 && !(r.gift2 === 'recipe' && S.friend[r.k] % 3 === 2)) { const [id, n] = pick(S.friend[r.k] % 3 === 0 ? r.gift : r.gift2); add(S.inv, id, n); S.known.i[id] = true; extra = `<br>「よかったら持っていって」 ${ingName(id)}×${n} をもらった（倉庫へ）`; }
    else if (r.gift && S.friend[r.k] % 3 !== 2) {}
    else if (S.friend[r.k] % 3 === 0) { const sd = pick(SEEDS.filter(g => !FANTASY.has(g.id) && !HYBS.has(g.id))); add(S.seeds, sd.id, 3); extra = `<br>「これ、余ったからあげるよ」 ${sd.name}の種×3 をもらった（倉庫へ）`; }
    else if (S.friend[r.k] % 3 === 2) { const un = REC.map((x, i) => i).filter(i => !S.learned[i] && !S.known.r[i] && !SECRET_R.has(i) && !REC[i].ings.some(id => FANTASY.has(id) || RARE_FISH.has(id))); if (un.length) { const ri = pick(un); learnRecipes([ri]); extra = `<br>「うちの秘伝なんだけど…」 レシピ『${REC[ri].name}』を教わった！`; } }
  }
  if (r.k === 'witch' && unl('story') && storyState().n === 5) { S.story.mira = true; toast('<b>魔女のミラ</b><br>「……その日記。マルタの字ね」', 3500); storyTick(); return; }
  toast(`<b>${r.name}</b>（親しさ ${S.friend[r.k] || 0}）<br>「${pick(r.lines)}」${extra}`, 4200);
}
const LIKES = {witch:['amethyst','moonstone','yasho'], beard:['iron','gold','meitetsu'], lizard:['ruby','emerald','diamond'], baker:['wheat','honey','strawberry'], florist:['lavender','honey','strawberry'], watch:['sake','beef','coffee'], bard:['wine','sake','honey'], mail:['apple','bread','milk'], oldfisher:['sake','rice','umeboshi'], scholar:['tea','matcha','coffee'], dancer:['chocolate','strawberry','wine']};
function giveGift(a, id) {
  const r = RESIDENTS[a.res]; if (!takeIng(id, false, 1)) return;
  const like = (LIKES[r.k] || []).includes(id), pts = like ? 6 : 3; S.friend[r.k] = (S.friend[r.k] || 0) + pts; sfx('ok'); syncBag();
  let rw = ''; if (like) { const gold = ING[INGI[id]].value * 2; S.gold += gold; rw = `<br>お礼に ${fmt(gold)}G をもらった。`; }
  toast(`<b>${r.name}</b>「${like ? 'これは…！ ずっと欲しかったんだ。' : 'いいのかい？ ありがとう。'}」<br>親しさ +${pts}（${S.friend[r.k]}）${rw}`, 4000);
}
const WARES = [{id:'w1', name:'銀の器', bonus:.1, need:{silver:3, amethyst:1}, cost:300}, {id:'w2', name:'金の器', bonus:.2, need:{gold:3, ruby:1}, cost:800}, {id:'w3', name:'星の器', bonus:.35, need:{diamond:1, moonstone:1, gold:2}, cost:3000}];
function needOk(need) { return Object.entries(need).every(([k, n]) => haveIng(k) >= n); }
function srcHint(id) { const g = ING[INGI[id]]; if (g.src[0] === 'ore') { const L = LAYERS.findIndex(l => l.rocks[id]); return L >= 0 ? `迷宮B${L * 10 + 1}〜で掘れる` : '地下迷宮'; }
  if (g.src[0] === 'mine') { const L = LAYERS.findIndex(l => l.forage.includes(id)); return L >= 0 ? `迷宮B${L * 10 + 1}〜` : '地下迷宮の魔物'; } return srcText(g); }
function needHTML(need) { return Object.entries(need).map(([k, n]) => `<span class="chipin ${haveIng(k) >= n ? 'ok' : 'ng'}">${ingName(k)}×${n}${isKnown(k) ? '' : `<small style="opacity:.75">（${srcHint(k)}）</small>`}</span>`).join(''); }
const ARMOR_N = ['なし', '銅の鎧', '鉄の鎧', '金の鎧', 'ミスリルの鎧', '星鉄の鎧', '冥鉄の鎧', '夜晶の鎧', '星喰の鎧'];
const ARMOR_DEF = [0, .12, .2, .28, .35, .42, .48, .53, .58];
const armorDef = () => ARMOR_DEF[S.armor || 0];
const armorNeed = t => t === 1 ? {copper:4, coal:2} : {[GEAR[t - 1].unlock]:4, coal:1 + t};
const armorFee = t => Math.round(GEAR[t - 1].price * .5);
function openForge(a) {
  const M = mineState(); if (!S.wares) S.wares = {};
  let html = `<div class="btn big" data-a="talk">話す</div><div style="display:flex;gap:3px;margin-top:3px"><div class="btn big grn" data-a="wf" style="flex:1">⚔ 武器を作る</div>${gearSt().list.some(g => !isAcc(g)) ? '<div class="btn big" data-a="wk" style="flex:1">🔨 工房</div>' : ''}${unl('arms') ? '<div class="btn big blu" data-a="ench" style="flex:1">💎 付与</div>' : ''}<div class="btn big" data-a="gear" style="flex:1">装備</div></div><div class="h">ツルハシの強化（1段階上に作り直す。耐久も満タンに）</div>`;
  const ups = S.toolInv.filter(t => ['pick'].includes(TOOLI[t.id].kind) && TOOLI[t.id].tier < 8);
  html += (ups.length ? '' : '<div class="p">強化できるツルハシがない。</div>') + ups.map(t => { const tl = TOOLI[t.id], nx = tl.tier + 1, g = GEAR[nx - 1], need = {[g.unlock]: 3, coal: 2 + nx}, fee = Math.round(g.price * .35), lock = !M.ever[g.unlock];
    return `<div class="row">${icHTML(tl.icon, U * 10, 'atlas', null, 't:' + tl.id)}<div class="t"><b>${tl.name} → ${g.name}</b><span>${lock ? `🔒 ${ingName(g.unlock)}を掘り出すと強化できる` : needHTML(need) + `　${fmt(fee)}G`}</span></div>${lock ? '' : `<div class="btn ${needOk(need) && S.gold >= fee ? '' : 'dis'}" data-up="${t.uid}">強化</div>`}</div>`; }).join('') || '<div class="p">強化できるツルハシを持っていない。</div>';
  { const cur = S.armor || 0, nt = cur + 1;
    html += `<div class="h">防具（迷宮で魔物から受けるダメージが減る）</div><div class="row"><div class="t"><b>今の防具：${ARMOR_N[cur]}${cur ? `（ダメージ -${Math.round(ARMOR_DEF[cur] * 100)}%）` : ''}</b>` + (nt <= 8 ? (() => { const need = armorNeed(nt), fee = armorFee(nt), lock = nt > 1 && !M.ever[GEAR[nt - 1].unlock];
      return `<span>${ARMOR_N[nt]}（ダメージ -${Math.round(ARMOR_DEF[nt] * 100)}%）　${lock ? `🔒 ${ingName(GEAR[nt - 1].unlock)}を掘り出すと作れる（${srcHint(GEAR[nt - 1].unlock)}）` : needHTML(need) + '　' + fmt(fee) + 'G'}</span></div>${lock ? '' : `<div class="btn ${needOk(need) && S.gold >= fee ? '' : 'dis'}" data-arm="${nt}">作る</div>`}</div>`; })() : '<span>最高の防具だ</span></div></div>'); }
  html += forgeDeepHTML();
  html += `<div class="h">宝石の器（陳列棚に置くと、その棚の料理が高くても売れる）</div>` + WARES.map(w => `<div class="row"><div class="t"><b>${w.name}（+${w.bonus * 100}%）　所持 ${S.wares[w.id] || 0}</b><span>${needHTML(w.need)}　${fmt(w.cost)}G</span></div><div class="btn ${needOk(w.need) && S.gold >= w.cost ? '' : 'dis'}" data-w="${w.id}">作る</div></div>`).join('');
  html = html.replace('<div class="h">防具', forgeRepairHTML() + '<div class="h">🪨 鉱石を買う</div>' + forgeOreHTML() + '<div class="h">防具');
  // v0.58.1：見出しごとに開け閉めできるように（開いている所は覚えておく）
  { const parts = html.split('<div class="h">'), top = parts.shift(), op = S.ui.fopen || {};
    html = top + parts.map((p, i) => { const j = p.indexOf('</div>'), t = p.slice(0, j), body = p.slice(j + 6), key = t.replace(/[（(].*$/, '').trim(); return `<details class="fsec" data-fs="${key}" ${op[key] ? 'open' : ''}><summary class="h">${t}</summary>${body}</details>`; }).join(''); }
  modal('鍛冶屋ガルド', html, 'forge');
  document.querySelectorAll('details.fsec').forEach(e => e.addEventListener('toggle', () => { S.ui.fopen = S.ui.fopen || {}; S.ui.fopen[e.dataset.fs] = e.open; })); bindForgeDeep(a); bindForgeRepair(a);
  bind('[data-a=talk]', () => { closeModal(); if (a) talk(a); else toast('ガルド「腹が減っては槌も振れん！ 用があるなら言ってくれ」'); });
  bind('[data-a=wf]', () => openWForge()); bind('[data-a=wk]', () => openWorks()); bind('[data-a=ench]', () => openEnchant()); bind('[data-a=gear]', () => openGear());
  bind('[data-arm]', d => { const t = +d.arm, need = armorNeed(t), fee = armorFee(t); if (!needOk(need) || S.gold < fee) return; for (const [k, n] of Object.entries(need)) takeIng(k, false, n); S.gold -= fee; S.armor = t; sfx('ok'); tut('armor'); toast(`ガルド「${ARMOR_N[t]}だ。これで少しは無茶ができるぞ」`, 3000); openForge(a); });
  bind('[data-up]', d => { const t = S.toolInv.find(x => x.uid === +d.up), tl = TOOLI[t.id], nx = tl.tier + 1, g = GEAR[nx - 1], need = {[g.unlock]: 3, coal: 2 + nx}, fee = Math.round(g.price * .35);
    if (!needOk(need) || S.gold < fee) return; for (const [k, n] of Object.entries(need)) takeIng(k, false, n); S.gold -= fee;
    t.id = (tl.kind === 'pick' ? 'pk' : 'sw') + nx; t.dur = TOOL_DUR[t.id]; sfx('ok'); toast(`ガルド「ほらよ、${TOOLI[t.id].name}だ。大事に使えよ」`, 3000); renderHot(); openForge(a); });
  bind('[data-w]', d => { const w = WARES.find(x => x.id === d.w); if (!needOk(w.need) || S.gold < w.cost) return; for (const [k, n] of Object.entries(w.need)) takeIng(k, false, n); S.gold -= w.cost; S.wares[w.id] = (S.wares[w.id] || 0) + 1; sfx('ok'); toast(`${w.name}ができた！ 陳列棚の画面で棚に置ける。`); openForge(a); });
}
function openTrap(loc) {
  if (!unl('forage')) return gateMsg('forage');
  const tp = S.traps[loc], name = loc === 'pond' ? '生簀' : '海岸';
  const html = `<div class="result"><div class="p">かご罠にエサを入れておくと、約4分ごとに獲物がかかる（倉庫へ・留守中も）。嵐の日は倍。<br>${loc === 'pond' ? 'エビ・ナマズ・ウナギ' : 'カニ・アサリ・エビ・ホタテ・タコ'}が獲れる。</div>
    <div class="nm">仕掛けた罠 ${tp.n}/3</div><div class="p">エサの残り：<b>${haveIng('bait')}</b>（市場の「道具」で買える）　手持ちの罠：${S.trapItems}</div></div>
    <div class="btn big ${S.trapItems > 0 && tp.n < 3 ? 'grn' : 'dis'}" data-a="put">罠を仕掛ける</div>`;
  modal('かご罠（' + name + '）', html, 'trap');
  bind('[data-a=put]', () => { if (S.trapItems <= 0 || tp.n >= 3) return; S.trapItems--; tp.n++; sfx('pop'); dirty = true; openTrap(loc); });
}
// v0.58.1：果樹園の看板から、4本の木をまとめて見る・植える・収穫する
function openOrchard(hill) {
  const idx = hill ? [...Array(hillLv() * 4).keys()].map(k => 4 + k) : [0, 1, 2, 3];
  const rows = idx.map((i, n) => { const t = S.trees[i], lb = hill ? `${Math.floor(n / 4) + 1}区の${n % 4 + 1}本目` : `${n + 1}本目`; if (!t) return `<div class="row"><div class="t"><b>${lb}：空き</b><span>苗木を選んで植える</span></div><div class="btn grn" data-ot="${i}">植える</div></div>`;
    const g = ING[INGI[t.id]], grown = t.g >= 1200, left = grown ? g.src[2] - (t.ft || 0) : 1200 - t.g;
    return `<div class="row">${ingIc(t.id, U * 10, false, true)}<div class="t"><b>${lb}：${g.name}の木</b><span>${t.fruit ? `実が${t.fruit}個なっている` : grown ? `次の実まで あと${Math.ceil(left / 60)}分` : `育成中 あと${Math.ceil(left / 60)}分`}</span></div>${t.fruit ? `<div class="btn grn" data-ot="${i}">収穫</div>` : ''}<div class="btn" data-pl="${i}" style="font-size:.8em">抜く</div></div>`; }).join('');
  modal(hill ? '丘の果樹' : '果樹園', `<div class="p">苗木を植えると約20分で育ち、その後は何度でも実る（1本に最大3個たまる）。農夫がいると自動で収穫する。「抜く」で別の苗木に植え替えられる（苗木代の半分が戻る）。${hill ? '' : '畑の右下の4つの盛り土をタップしても同じ。'}</div>` + (rows || '<div class="p">まだ土地を買っていない。</div>'), 'orchard');
  bind('[data-ot]', d => { const i = +d.ot; if (S.trees[i] && S.trees[i].fruit) { tapTree(i); openOrchard(hill); } else tapTree(i); });
  bind('[data-pl]', d => { const i = +d.pl; pullTree(i); if (S.trees[i]) return; openOrchard(hill); });
}
function tapTree(i) {
  if (!treeOn(i)) return i < 4 ? lockedMsg('orchard') : openHillLand();
  const t = S.trees[i];
  if (!t) { const fr = ING.filter(g => g.src[0] === 'tree');
    modal('苗木を植える', `<div class="p">苗木は約20分で育ち、その後は何度でも実る（最大3個たまる）。農夫がいると自動で収穫する。</div>` + fr.map(g => `<div class="row">${ingIc(g.id, U * 10, false, true)}<div class="t"><b>${g.name}の苗木</b><span>実るまでの間隔 ${Math.round(g.src[2] / 60)}分</span></div><div class="btn ${S.gold >= g.src[1] ? '' : 'dis'}" data-f="${g.id}">${fmt(g.src[1])}G</div></div>`).join(''), 'tree');
    bind('[data-f]', d => { const g = ING[INGI[d.f]]; if (S.gold < g.src[1]) return; S.gold -= g.src[1]; S.trees[i] = {id:d.f, g:0, ft:0, fruit:0}; sfx('pop'); dirty = true; closeModal(); toast(`${g.name}の苗木を植えた。`); });
    return; }
  if (t.fruit) { withQ(2.2, () => giveBag('i', t.id, false, t.fruit)); sfx('pop'); floatAt(TREEPOS[i][0], TREEPOS[i][1] - 14, `${ingName(t.id)} +${t.fruit}`, 'info'); t.fruit = 0; dirty = true; return; }
  const g = ING[INGI[t.id]], left = t.g < 1200 ? 1200 - t.g : g.src[2] - (t.ft || 0);
  modal(`${g.name}の木`, `<div class="p">${t.g < 1200 ? '育成中' : '次の実まで'} あと<b>${Math.ceil(left / 60)}分</b>（実は最大3個たまる）</div><div class="btn big" data-a="pull">苗木を抜く（${fmt(Math.floor(g.src[1] / 2))}G戻る）</div>`, 'tree');
  bind('[data-a=pull]', () => pullTree(i));
}
// v0.59 植えた苗木を抜く（苗木代の半分が戻る。2回押しで確定）
function pullTree(i) { const t = S.trees[i]; if (!t) return; const g = ING[INGI[t.id]], back = Math.floor(g.src[1] / 2);
  if (!(window.__pullArm && window.__pullArm.i === i && window.__pullArm.t > Date.now())) { window.__pullArm = {i, t:Date.now() + 2500}; return toast(`もう一度押すと<b>${g.name}の木を抜く</b>（実っている分は収穫される）`, 2500); }
  window.__pullArm = null; if (t.fruit) withQ(2.2, () => giveBag('i', t.id, false, t.fruit)); S.trees[i] = null; S.gold += back; sfx('pop'); dirty = true; closeModal(); toast(`${g.name}の木を抜いた（${fmt(back)}G戻った）。空いた場所に別の苗木を植えられる。`); }
function pickForage(f) { if (!S.forage.includes(f)) return; S.forage = S.forage.filter(x => x !== f); S.stat.foraged = (S.stat.foraged || 0) + 1; tmDrop(.003, '採集'); const g = Math.random() < .04 * luckMul(); withQ(rnd(1.4, 2.6), () => giveBag('i', f.id, g, 1)); sfx('pop'); floatAt(f.x, f.y - 10, (g ? '金色の' : '') + ingName(f.id) + ' +1', 'info'); }
function catAct() {
  const day = gday();
  if (S.catDay.d === day) { sfx('tick'); return toast('黒猫は満足そうに喉を鳴らしている。'); }
  const fish = [...POND, ...PIER].filter(g => !RARE_FISH.has(g.id) && haveIng(g.id)).sort((a, b) => a.value - b.value)[0];
  if (!fish) return toast('黒猫がじっと見ている。魚をあげると喜びそうだ。');
  takeIng(fish.id, false, 1); S.catDay.d = day; S.luckT = S.t + 600; S.rep = Math.min(100, S.rep + 1); sfx('ok');
  toast(`黒猫に${fish.name}をあげた。ご機嫌だ！<br>🐈 10分間、金色の食材が出やすくなる。`, 4000);
}
function pickGarden() {
  if (S.t - S.gardenT < 300) return toast('庭のハーブはまだ伸びていない。');
  S.gardenT = S.t; giveBag('i', 'basil', false, 2); sfx('pop'); if (Math.random() < .5) giveBag('i', 'tomato', false, 1);
  toast('庭でバジルを摘んだ（＋2）。'); floatAt(22, 140, 'バジル +2', 'info');
}

// ---------- farming
function lockedMsg(k) { const f = FAC[k]; toast(`🔒 ${f.name}：まだ使えない。<br>「施設」タブで${S.fac[k] ? '強化' : '設置'}（${fmt(f.cost(S.fac[k]))}G）すると開放`); }
function tapPlot(i) {
  if (!plotOn(i)) return i < 24 ? lockedMsg('plots') : openHillLand();
  const p = S.plots[i], h = heldItem();
  if (h && h.t === 'tool' && toolOf(h).kind === 'sickle' && ready(p)) {
    const tl = toolOf(h), {fx, size} = plotGrp(i), row = Math.floor((i - fx) / 4);
    const area = tl.area >= 12 ? [...Array(size).keys()].map(k => fx + k) : [0,1,2,3].map(k => fx + row * 4 + k);
    let c = 0; for (const j of area) if (plotOn(j) && ready(S.plots[j])) { const r = harvestPlot(j, true); floatAt(PLOTS[j].x + 6, PLOTS[j].y, '+' + r.n, 'info'); c++; }
    useTool(toolInst(h.uid)); sfx('pop'); toast(`${tl.name}で${c}区画をまとめて収穫した。`, 1500); syncBag(); return;
  }
  if (h && h.t === 'ing' && FERTS.has(h.id) && p.seed && !ready(p)) {
    if (p.fz) return toast('この区画にはもう肥料をまいてある。');
    p.fz = h.id; if (soilOn()) p.soil = Math.min(100, soilV(p) + 15); takeIng(h.id, false, 1); syncBag(); sfx('pop'); floatAt(PLOTS[i].x + 6, PLOTS[i].y, ingName(h.id), 'info'); return;
  }
  if (ready(p)) { const r = harvestPlot(i, true); sfx('pop'); floatAt(PLOTS[i].x + 6, PLOTS[i].y, `${r.g.name}${r.gold ? '★金色' : ''} +${r.n}`, r.gold ? '' : 'info'); if (r.gold) toast(`<b>金色の${r.g.name}</b>が採れた！ 料理に使うと3倍の値で売れる。`); syncHot(); dirty = true; return; }
  if (!p.seed && h && h.t === 'tool' && toolOf(h).kind === 'hoe') {
    const tl = toolOf(h), {fx, size} = plotGrp(i), row = Math.floor((i - fx) / 4);
    const area = (tl.area >= 12 ? [...Array(size).keys()].map(k => fx + k) : [0,1,2,3].map(k => fx + row * 4 + k)).filter(j => plotOn(j) && !S.plots[j].seed);
    return openPlant(null, false, area, toolInst(h.uid));
  }
  if (!p.seed) {
    if (h && h.t === 'seed') { const sl = h.slot; if (sl.n > 0) { sl.n--; add(S.seeds, h.id, 1); plantPlot(i, h.id, false); sfx('pop'); floatAt(PLOTS[i].x + 6, PLOTS[i].y, '植えた', 'info'); syncBag(); } return; }
    return openPlant(i);
  }
  if (h && h.t === 'tool' && toolOf(h).kind === 'can') {
    if (p.w) return toast('もう水をやってある。');
    const inst = toolInst(h.uid), tl = TOOLI[inst.id], t = waterPlots(i, tl);
    if (t.length) { t.forEach(j => floatAt(PLOTS[j].x + 6, PLOTS[j].y + 4, '💧', 'info')); useTool(inst); renderHot(); }
    return;
  }
  const g = ING[INGI[p.seed]]; const left = Math.ceil((g.src[2] - p.g) / (p.w || 1));
  toast(`${ingLabel(p.seed)}：あと ${secT(left)}${p.w ? '（水やり済み）' : '　ジョウロを持ってタップすると水やり'}`);
}
function openPlant(i, all = false, area = null, hoe = null) {
  const list = SEEDS.filter(g => (!FANTASY.has(g.id) || S.fac.greenhouse) && (!HYBS.has(g.id) || haveSeed(g.id)));
  const empty = scenePlots(i != null ? plotScene(i) : scene === 'hill' ? 'hill' : 'farm').filter(j => !S.plots[j].seed);
  const target = i != null && !all && !S.plots[i].seed ? i : null;
  if (area) { const a2 = area.filter(j => !S.plots[j].seed);
    modal('クワでまとめて植える', `<div class="p">空き区画 <b>${a2.length}</b> にまとめて植える（種が無いときは自動で購入）</div>` + list.map(g => `<div class="row" data-id="${g.id}">${ingIc(g.id, U * 11, false, !!haveSeed(g.id))}<div class="t"><b>${g.name}</b><span>所持 ${haveSeed(g.id)}　種 ${g.src[1]}G</span></div><div class="btn">植える</div></div>`).join(''), 'plant');
    bind('.row', d => { let n = 0; for (const j of a2) { if (plantPlot(j, d.id, true)) n++; else break; } if (!n) return toast('お金が足りない。'); if (hoe) useTool(hoe); sfx('pop'); toast(`${ingName(d.id)}を${n}か所に植えた。`, 1500); syncBag(); closeModal(); });
    return; }
  const html = `<div class="p">${all ? '空いている区画<b>すべて</b>に植えます。' : target != null ? 'タップした区画に植えます。続けて別の種も選べます。' : '空いている区画に1つずつ植えます。続けて選べます。'}<br>空き区画 <b>${empty.length}</b>　種が無いときは自動で購入</div>` +
    list.map(g => `<div class="row" data-id="${g.id}">${ingIc(g.id, U * 11, false, !!haveSeed(g.id))}<div class="t"><b>${g.name}${haveSeed(g.id) || isKnown(g.id) ? '' : ''}</b><span>所持 ${haveSeed(g.id)}　育成 ${secT(g.src[2])}　種 ${g.src[1]}G</span></div><div class="btn ${empty.length ? '' : 'dis'}">${all ? 'すべて' : '植える'}</div></div>`).join('');
  modal(all ? 'まとめて植える' : '種を植える', html, 'plant');
  bind('.row', d => {
    const targets = target != null ? [target] : all ? empty : empty.slice(0, 1);
    let n = 0; for (const j of targets) { if (plantPlot(j, d.id, true)) n++; else break; }
    if (!n) return toast(targets.length ? 'お金が足りない。' : '空いている区画がない。');
    sfx('pop'); targets.slice(0, n).forEach(j => floatAt(PLOTS[j].x + 6, PLOTS[j].y, '植えた', 'info'));
    toast(`${ingName(d.id)}を${n}か所に植えた。`, 1500); syncBag(); openPlant(null, all);
  });
}
function allIngs() {
  const m = {};
  for (const id in S.inv) m[id + '|0'] = {id, g:false, n:0};
  for (const id in S.invG) m[id + '|1'] = {id, g:true, n:0};
  for (const sl of S.bag) if (sl && sl.k === 'i') m[sl.id + '|' + (sl.g ? 1 : 0)] = {id:sl.id, g:!!sl.g, n:0};
  return Object.values(m).map(x => (x.n = haveIng(x.id, x.g), x)).filter(x => x.n > 0 && !isItem(x.id)).sort((a, b) => INGI[a.id] - INGI[b.id] || a.g - b.g);
}
function allDishes() {
  const m = {};
  for (const k in S.dishG) m[k + '|1'] = {k, g:true}; for (const k in S.dish) m[k + '|0'] = {k, g:false};
  for (const sl of S.bag) if (sl && sl.k === 'd') m[sl.key + '|' + (sl.g ? 1 : 0)] = {k:sl.key, g:!!sl.g};
  return Object.values(m).map(x => (x.n = haveDish(x.k, x.g), x)).filter(x => x.n > 0).sort((a, b) => b.g - a.g || dval(b.k, b.g) - dval(a.k, a.g));
}
// ---------- cooking
let cook = {slots:[], method:'焼く', tab:'free'};
function openCook() {
  cook = {slots:[], method:cook.method, tab:cook.tab || 'free'};
  renderCook();
}
function recipeAvail(r) { const need = {}; r.ings.forEach(id => need[id] = (need[id] || 0) + 1); return Object.keys(need).every(id => haveIng(id) >= need[id]); }
// v0.51 作るリスト（レシピのウィッシュリスト）：S.wish = {ri: 皿数}
const wishL = () => (S.wish = S.wish || {});
const haveAnyIng = id => haveIng(id) + haveIng(id, true);
let wishVer = 0, wishC = null;   // v0.57.4：作るリストの必要数は、変わるまで計算し直さない（放置の計算が重かった）
function wishNeed() { const w = wishL(), key = wishVer + ':' + S.t; if (wishC && wishC.key === key) return wishC.n; const n = {}; for (const ri in w) for (const id of REC[ri].ings) n[id] = (n[id] || 0) + w[ri]; wishC = {key, n}; return n; }
// v0.56：作るリストに必要な作物で、手持ち＋育てている数が足りない物（農夫が優先して植える）
function wishCrop() {
  if (!S.wish || !Object.keys(S.wish).length) return null; const need = wishNeed();
  for (const id in need) { const g = ING[INGI[id]]; if (!g || g.src[0] !== 'seed' || HYBS.has(id)) continue;
    const growing = S.plots.filter(p => p.seed === id).length * 1.5; if (haveAnyIng(id) + growing < need[id]) return id; }
  return null;
}
function wishSeedNeed(id) { const n = wishNeed()[id] || 0; return n ? Math.max(0, n - haveAnyIng(id)) : 0; }
function wishToggle(ri) { wishVer++; const w = wishL(); if (w[ri]) delete w[ri]; else { w[ri] = 1; tut('m_wish'); } dirty = true; }
function wishHTML() {
  const w = wishL(), ks = Object.keys(w).map(Number); if (!ks.length) return `<div class="h">📝 作るリスト</div><div class="p">レシピの右の☆を押すと「作るリスト」に入る。市場では、必要な食材に★と、あと何個いるかが出る。</div>`;
  const need = wishNeed();
  return `<div class="h">📝 作るリスト（${ks.length}品）</div>` + ks.map(ri => { const r = REC[ri], n = w[ri], cnt = {}; r.ings.forEach(id => cnt[id] = (cnt[id] || 0) + 1);
    const ok = Object.keys(cnt).every(id => haveAnyIng(id) >= cnt[id] * n);
    return `<div class="row">${icHTML(r.icon, U * 11, 'atlas', null, 'r:' + ri)}<div class="t"><b>${r.name} ×${n}${ok ? ' <span style="color:#8ad08a;font-weight:normal">材料そろった</span>' : ''}</b><span>${r.method}：${Object.keys(cnt).map(id => { const h = haveAnyIng(id), nd = cnt[id] * n; return `<span class="chipin ${h >= nd ? 'ok' : 'ng'}">${ingLabel(id)} ${h}/${nd}</span>`; }).join('')}</span></div><div style="display:flex;gap:${U * .6}px;align-items:center"><div class="btn" data-wn="${ri}:-1">−</div><div class="btn" data-wn="${ri}:1">＋</div><div class="btn" data-wx="${ri}">✕</div></div></div>`; }).join('')
    + `<div class="p" style="color:#8ad0c8">🔒 作るリストの材料は、料理人が使わずに取っておく（作るたびにリストの皿数が減り、0になると外れる）</div><div class="p" style="color:var(--sub)">足りない食材の合計：${Object.keys(need).filter(id => haveAnyIng(id) < need[id]).map(id => `${ingLabel(id)}×${need[id] - haveAnyIng(id)}`).join('・') || 'なし（全部そろっている）'}</div>`;
}
const wishStar = ri => `<div class="btn" data-wl="${ri}" style="min-width:${U * 7}px;${wishL()[ri] ? 'color:#ffd860' : 'color:var(--sub)'}">${wishL()[ri] ? '★' : '☆'}</div>`;
function ingChips(r, reveal) { const need = {}; r.ings.forEach(id => need[id] = (need[id] || 0) + 1);
  return Object.keys(need).map(id => `<span class="chipin ${haveIng(id) >= need[id] ? 'ok' : 'ng'}">${reveal ? ingName(id) : ingLabel(id)}${need[id] > 1 ? '×' + need[id] : ''}</span>`).join(''); }
function cookBuyCost(r) { const c = {}; r.ings.forEach(id => c[id] = (c[id] || 0) + 1); let cost = 0; for (const id in c) { const l = c[id] - haveIng(id); if (l > 0) { if (ING[INGI[id]].src[0] !== 'market') return -1; cost += ING[INGI[id]].src[1] * l; } } return cost; }
function renderCookBook() {
  const list = REC.map((r, i) => i).filter(i => S.known.r[i] || S.learned[i]), w = wishL();
  list.sort((a, b) => (w[b] ? 1 : 0) - (w[a] ? 1 : 0) || recipeAvail(REC[b]) - recipeAvail(REC[a]) || REC[b].value - REC[a].value);
  const html = `<div class="seg"><div data-tab="free">自由に作る</div><div class="on" data-tab="book">レシピ帳 ${list.length}</div></div>
    <div class="p">知っているレシピ。「材料をセット」で食材と調理法がそろう。☆で作るリストに入り、上に並ぶ。</div><div class="itool"><input id="ckq" placeholder="🔍 料理名・食材名で探す" value="${(cook.q || '').replace(/"/g, '')}"></div>` +
    list.map(ri => { const r = REC[ri], ok = recipeAvail(r), kn = S.known.r[ri], bc = ok ? -1 : cookBuyCost(r);
      return `<div class="row" data-nm="${r.name}・${r.ings.map(ingName).join('・')}">${icHTML(r.icon, U * 11, 'atlas', null, 'r:' + ri)}<div class="t"><b>${r.name}${monTag('r' + ri)} ${kn ? mastStars('r' + ri) : '<span style="color:#8ad0c8;font-size:.8em">未調理</span>'}</b><span>${r.method}：${ingChips(r, true)}</span></div>${wishStar(ri)}${bc >= 0 ? `<div class="btn ${S.gold >= bc ? 'grn' : 'dis'}" data-bc="${ri}" style="font-size:.85em">買って作る<br>${fmt(bc)}G</div>` : `<div class="btn ${ok ? 'grn' : 'dis'}" data-set="${ri}">材料を<br>セット</div>`}</div>`; }).join('');
  modal('かまど', html, 'cook');
  bind('[data-tab]', d => { cook.tab = d.tab; cook.back = null; renderCook(); $('mbody').scrollTop = 0; });
  bind('[data-set]', d => { const r = REC[d.set]; cook.method = r.method; cook.slots = r.ings.map(id => ({id, g:false})); cook.back = 'book'; cook.bookY = $('mbody').scrollTop; cook.tab = 'free'; sfx('tick'); renderCook(); $('mbody').scrollTop = 0; });
  bind('[data-wl]', d => { wishToggle(+d.wl); renderCook(); });
  bind('[data-bc]', d => { const r = REC[d.bc], c = cookBuyCost(r); if (c < 0 || S.gold < c) return; const cnt = {}; r.ings.forEach(id => cnt[id] = (cnt[id] || 0) + 1); for (const id in cnt) { const l = cnt[id] - haveIng(id); if (l > 0) buyMarket(id, l); }
    cook.method = r.method; cook.slots = r.ings.map(id => ({id, g:false})); cook.back = 'book'; cook.bookY = $('mbody').scrollTop; cook.tab = 'free'; toast(`足りない材料を市場で買った（${fmt(c)}G）`); doCook(1); });
  cookSearch('#ckq', '.row[data-nm]');
  if (cook.bookY != null) { $('mbody').scrollTop = cook.bookY; cook.bookY = null; }
}
// かまどの名前検索（打つたびに絞り込む。画面は作り直さない）
function cookSearch(inp, sel) { const e = document.querySelector(inp); if (!e) return; const f = () => { cook.q = e.value; const q = e.value.trim(); document.querySelectorAll(sel).forEach(x => x.style.display = !q || x.dataset.nm.includes(q) ? '' : 'none'); }; e.oninput = f; f(); }
function cookKey() { return cook.method + '|' + cook.slots.map(s => s.id).sort().join(','); }
function renderCook() {
  if (cook.tab === 'book') return renderCookBook();
  const k = cookKey(), ri = RKEY[k], known = ri != null && S.known.r[ri], ck = 'c:' + k, cre = S.creative[ck];
  const items = allIngs();
  const used = (id, g) => cook.slots.filter(s => s.id === id && s.g === g).length;
  let maxN = 99; const cnt = {};
  cook.slots.forEach(s => { const kk = s.id + (s.g ? '*' : ''); cnt[kk] = (cnt[kk] || 0) + 1; });
  for (const kk in cnt) { const g = kk.endsWith('*'), id = g ? kk.slice(0, -1) : kk; maxN = Math.min(maxN, Math.floor(haveIng(id, g) / cnt[kk])); }
  let prev = '？？？';
  if (cook.slots.length) prev = known ? REC[ri].name : (ri != null && S.learned[ri]) ? REC[ri].name + '（初めて作る）' : cre ? cre.name : (ri != null ? '？？？（未発見のレシピ）' : '？？？');
  const html = `${unl('airec') ? `<div class="btn blu" data-tr="1" style="display:block;margin-bottom:${U * 1.4}px;text-align:center">🧪 試作台（料理長とオリジナルレシピを作る）</div>` : ''}<div class="seg"><div class="on" data-tab="free">自由に作る</div><div data-tab="book">レシピ帳</div></div><div class="seg many">${METHODS.map(m => `<div class="${m === cook.method ? 'on' : ''}" data-m="${m}">${m}</div>`).join('')}</div>
   <div class="slots">${[0,1,2,3].map(i => { const s = cook.slots[i]; return `<div class="slot ${s ? 'fill' : ''}" data-i="${i}">${s ? ingIc(s.id, U * 13, s.g) : ''}</div>`; }).join('')}</div>
   <div style="text-align:center;font-size:${U * 5.2}px;margin-bottom:${U * 2}px">${cook.slots.length ? prev : '食材を1〜4つ選ぶ'}</div>
   <div style="display:flex;gap:${U * 1.5}px;margin-bottom:${U * 2}px">
     <div class="btn big ${cook.slots.length && maxN > 0 ? '' : 'dis'}" data-n="1" style="flex:1">作る ×1</div>
     <div class="btn big ${cook.slots.length && maxN > 1 ? '' : 'dis'}" data-n="${Math.min(maxN, 10)}" style="flex:1">まとめて ×${Math.max(1, Math.min(maxN, 10))}</div></div>
   <div class="itool"><input id="ckq2" placeholder="🔍 食材名で探す" value="${(cook.q || '').replace(/"/g, '')}"></div><div class="grid">${items.map(it => `<div class="cell ${it.g ? 'gold' : ''} ${it.n - used(it.id, it.g) <= 0 ? 'dim' : ''}" data-nm="${ingName(it.id)}" data-id="${it.id}" data-g="${it.g ? 1 : 0}">${ingIc(it.id, U * 13, it.g)}<span class="n">${it.n - used(it.id, it.g)}</span></div>`).join('') || '<div class="p">食材がない。農場や市場で手に入れよう。</div>'}</div>
   <div class="p">金色の食材を使うと、金色の料理（売値3倍）ができる。</div>`;
  modal('かまど', html, 'cook');
  bind('[data-tr]', () => openTrial());
  bind('[data-m]', d => { cook.method = d.m; renderCook(); });
  bind('[data-tab]', d => { const keep = d.tab === 'book' && cook.bookY != null; cook.tab = d.tab; cook.back = null; renderCook(); if (!keep) $('mbody').scrollTop = 0; });
  bind('.slot', d => { cook.slots.splice(+d.i, 1); renderCook(); });
  bind('.cell', d => { const g = d.g === '1'; const have = haveIng(d.id, g); if (cook.slots.length >= 4 || have - used(d.id, g) <= 0) return; cook.slots.push({id:d.id, g}); renderCook(); });
  bind('[data-n]', d => doCook(+d.n));
  cookSearch('#ckq2', '.cell[data-nm]');
}
function doCook(n) {
  if (!cook.slots.length) return;
  const k = cookKey(), ri = RKEY[k], gold = cook.slots.some(s => s.g);
  const cq = cook.slots.reduce((a, s) => a + (s.g ? 3 : qOf(s.id)), 0) / cook.slots.length;
  for (const s of cook.slots) takeIng(s.id, s.g, n);
  let key, isNew = false, name;
  if (ri != null) { key = 'r' + ri; isNew = !S.known.r[ri]; S.known.r[ri] = true; if (S.menu[ri] === undefined) S.menu[ri] = true; name = REC[ri].name;
    if (S.wish && S.wish[ri]) { wishVer++; S.wish[ri]--; if (S.wish[ri] <= 0) { delete S.wish[ri]; setTimeout(() => toast(`📝 作るリストの「${name}」を作り終えた。取り置いていた材料は、料理人も使えるようになる。`, 3500), 600); } } }
  else {
    key = 'c:' + k; const ids = cook.slots.map(s => s.id);
    if (!S.creative[key]) {
      isNew = true; const u = [...new Set(ids)];
      name = (u.length === 1 ? ingName(u[0]) : ingName(u[0]) + 'と' + ingName(u[1])) + 'の' + MSUF[cook.method] + (u.length > 2 ? '・' + ingName(u[2]) + '添え' : '');
      S.creative[key] = {name, ings:ids, method:cook.method, value:Math.round(ids.reduce((s, id) => s + ING[INGI[id]].value, 0) * 1.3 + 4)};
    }
    name = S.creative[key].name;
  }
  blendDQ(key, n, cq); add(gold ? S.dishG : S.dish, key, n); S.stat.cooked += n; S.mast[key] = (S.mast[key] || 0) + n; sfx('cook'); ultCooked(key);
  let nearMsg = '';
  if (ri == null) { const nr = nearRecipe(cook.method, cook.slots.map(x => x.id)); if (nr != null) { S.near[nr] = true; const B = REC[nr].ings, A = cook.slots.map(x => x.id), extra = A.filter(x => !B.includes(x)).length, miss = B.filter(x => !A.includes(x)).length;
    const kind = extra && miss ? 'どれか1つの食材が違う' : extra ? `食材が${extra}つ多い` : `食材が${miss}つ足りない`;
    const okIng = A.find(x => B.includes(x));
    nearMsg = `<div class="nearbox"><b>💡 惜しい！</b>${kind}みたいだ。<br><span>「${ingName(okIng)}」は合っている気がする……（レシピ帳の「惜しかった組み合わせ」に記録）</span></div>`; } }
  player.cooking = 1.2;
  const v = dval(key, gold);
  const html = `<div class="result">${dishIcHTML(key, U * 34, gold)}<div class="nm">${gold ? '金色の' : ''}${name} ×${n}</div>
    ${isNew ? `<div class="badge">${ri != null ? '新しいレシピを発見！' : '創作料理が誕生！'}</div>` : ''}
    <div class="p">価値 ${fmt(v)}G ${mastStars(key)}　${qHTML(dqOf(key))}　${ri == null ? '（創作料理は正規のレシピより価値が低め）' : ''}</div><div>${tasteHTML(dishTaste(key))}</div>${nearMsg}</div>
    ${ordBtnHTML(key)}${aiButtonHTML(key)}<div style="height:${U * 1.4}px"></div><div class="btn big" data-a="again">${cook.back === 'book' ? '📖 レシピ帳に戻る' : '続けて作る'}</div><div style="height:${U * 1.4}px"></div><div class="btn big blu" data-a="shelf">陳列棚へ</div>`;
  modal('できあがり', html, 'cookres');
  bind('[data-ai]', (d, el) => aiNameDish(d.ai, el));
  bind('[data-od]', d => { if (deliverOrder(+d.od)) { closeModal(); } });
  bind('[data-a]', d => d.a === 'again' ? (cook.slots = cook.slots.filter(s => haveIng(s.id, s.g) > 0), cook.back === 'book' && (cook.tab = 'book', cook.back = null), renderCook()) : openShelf(-1));
  if (isNew && ri != null) toast(`レシピ「${name}」を図鑑に登録した。従業員も作れるようになる。`);
}

function ordBtnHTML(key) {
  if (!unl('orders') || !S.orders) return ''; const i = S.orders.findIndex(o => 'r' + o.ri === key); if (i < 0) return ''; const o = S.orders[i], h = haveDish(key);
  return h >= o.n ? `<div class="btn big grn" data-od="${i}" style="margin-bottom:${U * 1.4}px">📜 依頼に届ける（${o.who}・×${o.n}・${fmt(o.reward)}G）</div>` : `<div class="p" style="color:#e8c060">📜 ${o.who}の依頼の料理！ あと${o.n - h}皿で届けられる（棚に並べると売れてしまうので注意）</div>`;
}
const hintCost = () => { const H = S.hint && !S.known.r[S.hint.ri] && !S.learned[S.hint.ri] && S.hint.ings ? S.hint : null; return H && H.ings.length < REC[H.ri].ings.length - 1 ? 100 + 60 * H.ings.length : 100; };
function nearRecipe(method, ids) {
  const cnt = a => a.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
  const A = cnt(ids); let best = null, bd = 9;
  REC.forEach((r, i) => { if (r.method !== method || S.known.r[i]) return; const B = cnt(r.ings); let d = 0;
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) d += Math.abs((A[k] || 0) - (B[k] || 0));
    const common = Object.keys(A).filter(k => B[k]).length; if (common >= 1 && d <= 2 && d < bd) { bd = d; best = i; } });
  return best;
}

// ---------- calendar (暦)
function dayEvents(d) {
  const Y = ymd(d), m = Y.m, dim = wdOf(d), out = [], today = gday();
  if (unl('season') && dim >= 5) out.push({i:'🎐', t:'行事：' + EVENTS[m].n, s:EVENTS[m].d});
  if (unl('rival') && S.rival && !S.rival.ally && dim === 7 && Math.floor(d / 7) >= S.rival.open) out.push({i:'☀', t:'白昼亭との売上勝負：結果発表', s:'この日が終わると、今週の売上で勝ち負けが決まる'});
  if (unl('moon') && dim === 4) out.push({i:'🌕', t:'満月の夜', s:'19時〜朝5時。広場に月の兎の夜店。迷宮に月光スライム。魔物がなつきやすい'});
  if (unl('merchant') && (dim === 2 || dim === 6)) out.push({i:'🐴', t:'行商人ドルンが来る', s:'広場に10時〜22時。珍しい食材や本'});
  if (unl('contest') && dim >= 4) { const th = Math.floor(d / 7) === Math.floor(today / 7) ? themeName(contestTheme().th) : null; out.push({i:'🏆', t:'料理コンテスト（木〜日曜）', s:th ? 'テーマ：' + th : 'テーマは週の初め（月曜）に発表'}); }
  if (unl('critic') && S.critic && S.critic.at && Math.floor(S.critic.at / 1440) === d) out.push({i:'🧐', t:'料理評論家が来るらしい', s:d - today <= 1 ? '一番価値の高い料理を棚に' : 'うわさ'});
  if (S.resv && Math.floor(S.resv.due / 1440) === d) out.push({i:'🍷', t:`宴会の予約：${S.resv.who}`, s:`${dishInfo(S.resv.key).name}×${S.resv.n}`});
  if (unl('season') && Y.dd === 1 && [2, 5, 8, 11].includes(m)) out.push({i:SEASONS[[3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3][m]].i, t:SEASONS[[3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3][m]].n + 'のはじまり', s:'旬の作物と魚が変わる'});
  if (unl('stall')) out.push({i:'🏮', t:'夜市（出張販売）', s:'18時〜翌2時', daily:1});
  if (unl('lottery') && dim === 7) out.push({i:'🎫', t:'週の宝くじ 当選発表', s:'この日の夜（週の終わり）に発表'});
  if (unl('auction') && dim === 6) out.push({i:'🔨', t:'行商人の競り', s:'目玉：' + AUC_LOTS[Math.floor(d / 7) % AUC_LOTS.length].d});
  if (unl('night')) out.push({i:'🌙', t:'裏営業（深夜の客）', s:'21時〜深夜1時50分。1晩に1回', daily:1});
  if (d === today && unl('season')) out.unshift({i:wx().i, t:'今日の天気：' + wx().n, s:wx().d || ''});
  return out;
}
let calSel = null;
function openCal() {
  const today = gday();
  if (calSel == null || calSel < today) calSel = today;
  let html = '<div class="p">暦。行事や行商人、コンテストなど日によって違う出来事。日付をタップすると詳しく見られる。1週間は月曜〜日曜。</div>';
  let st = today - (ymd(today).dd - 1);
  for (let k = 0; k < 2; k++) {
    const Y = ymd(st), mi = Y.m, se = SEASONS[[3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3][mi]], n = DIMS[mi];
    html += `<div class="h">${MONTHS[mi]}（${mi + 1}月）${unl('season') ? '　' + se.i + se.n : ''}${unl('season') ? '　行事：' + EVENTS[mi].n + '（毎週 金〜日曜）' : ''}</div>`;
    html += `<div class="calrow calwk">${WDN.map((w, i) => `<div class="calc calhd" style="${i === 5 ? 'color:#7ab0e8' : i === 6 ? 'color:#e87a7a' : ''}"><b>${w}</b></div>`).join('')}</div><div class="calrow calgrid">`;
    for (let i = 1; i < wdOf(st); i++) html += '<div class="calc calpad"></div>';
    for (let dd = 0; dd < n; dd++) { const d = st + dd, ev = dayEvents(d).filter(e => !e.daily && !(d === today && e.t.startsWith('今日の天気')));
      html += `<div class="calc ${d === today ? 'today' : ''} ${d < today ? 'past' : ''} ${d === calSel ? 'sel' : ''}" data-cd="${d}"><b>${dd + 1}</b><span>${ev.map(e => e.i).join('')}</span></div>`; }
    html += '</div>'; st += n;
  }
  const ev = dayEvents(calSel), Y = ymd(calSel);
  html += `<div class="h">${MONTHS[Y.m]} ${Y.dd}日（${WDN[wdOf(calSel) - 1]}）${calSel === today ? '（今日）' : calSel === today + 1 ? '（明日）' : ''}の予定</div>` + (ev.length ? ev.map(e => `<div class="row"><div class="calev">${e.i}</div><div class="t"><b>${e.t}</b><span>${e.s}</span></div></div>`).join('') : '<div class="p">特別な予定はない。</div>');
  modal('暦', html, 'cal'); tut('m_cal');
  bind('[data-cd]', d => { if (d.cd != null) { calSel = +d.cd; openCal(); } });
}
// ---------- shelf & pricing (Moonlighter style)
let shelfSel = 0;
function openShelf(i) {
  if (i >= shelfCount()) return lockedMsg('shelf');
  if (i >= 0) shelfSel = i;
  renderShelf();
}
function nbHTML(key, g) {
  const n = S.nb[key + (g ? '*' : '')] || {}; const p = [];
  if (n.cheap) p.push(`<span>😊 安い ≤${fmt(n.cheap)}G</span>`);
  if (n.fair) p.push(`<span>🙂 ちょうど ≤${fmt(n.fair)}G</span>`);
  if (n.pricey) p.push(`<span>😓 高い ≤${fmt(n.pricey)}G</span>`);
  if (n.no) p.push(`<span>😠 高すぎ ≥${fmt(n.no)}G</span>`);
  return p.length ? `<div class="note">${p.join('')}</div><div class="p" style="text-align:center;color:var(--sub);font-size:.85em">ふつうの客の目安（お金持ちの客・流行の料理はもっと高くても買う）</div>` : `<div class="p" style="text-align:center">まだ客の反応の記録がない。売ってみて表情を見よう。</div>`;
}
function renderShelf() { syncShelf();
  const s = S.shelf[shelfSel];
  let html = `<div class="slots">${S.shelf.slice(0, shelfCount()).map((x, i) => `<div class="slot ${i === shelfSel ? 'fill' : ''}" data-s="${i}" style="${i === shelfSel ? 'outline:' + U * .8 + 'px solid #e8b858' : ''}">${x.n ? dishIcHTML(x.key, U * 13, x.g) + `<span class="n" style="position:absolute;right:2px;bottom:0;font-size:${U * 3.9}px;font-weight:800">${x.n}</span>` : ''}</div>`).join('')}</div>`;
  if (S.resv) html += `<div class="btn blu" data-a="resv" style="margin:${U}px auto ${U * 1.4}px;display:table">🍷 宴会の予約を見る（${dishInfo(S.resv.key).name}×${S.resv.n}）</div>`;
  if (S.auto.sell && S.staff.clerk) html += `<div class="p" style="text-align:center;color:#8ac898">自動販売中：店員が並べて値段を決めています（${{strong:'強気', normal:'通常', cheap:'安売り'}[S.auto.mode]}）</div>`;
  if (s.n) {
    const d = dishInfo(s.key);
    html += `<div style="text-align:center;font-size:${U * 5.46}px;font-weight:800">${s.g ? '金色の' : ''}${d.name}　残り${s.n}</div>
      <div class="price"><div class="btn" data-p="-10%">−10%</div><div class="btn" data-p="-1">−1</div><div class="v">${fmt(s.price)}G</div><div class="btn" data-p="+1">+1</div><div class="btn" data-p="+10%">+10%</div></div>
      ${nbHTML(s.key, s.g)}
      ${s.draft ? `<div class="btn big grn" data-a="sell" style="margin-top:${U * 1.4}px">この値段で販売する</div><div class="p" style="text-align:center;color:#e0be6e">値段を決めるまで、この棚の料理は売れない（閉じても販売開始）</div>` : `<div class="p" style="text-align:center;color:#8ad08a">販売中${s.man && S.auto.sell && S.staff.clerk ? '（あなたが決めた値段。店員は変えない）' : ''}</div>`}${s.man && S.auto.sell && S.staff.clerk ? `<div class="btn" data-a="auto" style="margin:${U}px auto 0;display:table">値段を店員にまかせる</div>` : ''}
      <div class="btn" data-a="take" style="margin:${U * 1.4}px auto;display:table">棚から下げる</div>`;
  } else html += `<div class="p" style="text-align:center">この棚は空。下の料理から選んで並べよう（最大5個）。</div>`;
  if (!S.wares) S.wares = {}; if (!S.shelfWare) S.shelfWare = {};
  const cw = WARES.find(w => w.id === S.shelfWare[shelfSel]);
  if (cw || Object.values(S.wares).some(n => n > 0)) html += `<div class="row"><div class="t"><b>この棚の器：${cw ? cw.name + '（+' + cw.bonus * 100 + '%）' : 'なし'}</b><span>器を置くと、客が高めの値段でも買ってくれる</span></div>${WARES.filter(w => (S.wares[w.id] || 0) > 0 && w !== cw).map(w => `<div class="btn" data-ware="${w.id}">${w.name}</div>`).join('')}${cw ? '<div class="btn" data-ware="">外す</div>' : ''}</div>`;
  const items = allDishes();
  html += `<div class="h">手持ちの料理（倉庫・カバン・持ち物）</div><div class="itool"><input id="shq" placeholder="🔍 料理名で探す" value="${(cook.q2 || '').replace(/"/g, '')}"></div><div class="grid">${items.map(it => `<div class="cell ${it.g ? 'gold' : ''}" data-nm="${dishInfo(it.k).name}" data-k="${it.k}" data-g="${it.g ? 1 : 0}">${dishIcHTML(it.k, U * 13, it.g)}<span class="n">${it.n}</span></div>`).join('') || '<div class="p">料理がない。かまどで作ろう。</div>'}</div>`;
  modal('陳列棚と値付け', html, 'shelf', () => { if (S.shelf.some(x => x.draft)) { S.shelf.forEach(x => x.draft = false); toast('値段を決めて、販売を始めた。'); } });
  bind('[data-s]', d => { shelfSel = +d.s; renderShelf(); });
  bind('[data-p]', d => { const v = d.p; s.price = Math.max(1, v.endsWith('%') ? Math.round(s.price * (1 + parseInt(v) / 100)) : s.price + parseInt(v)); s.draft = true; s.man = true; dirty = true; renderShelf(); });
  bind('[data-a=auto]', () => { s.man = false; s.draft = false; s.price = Math.round(dval(s.key, s.g) * modeMult()); toast('この棚の値段を店員にまかせた。'); dirty = true; renderShelf(); });
  bind('[data-a=sell]', () => { S.shelf.forEach(x => { if (x.draft) x.draft = false; }); sfx('coin'); toast('値段を決めて、販売を始めた。'); renderShelf(); });
  bind('[data-ware]', d => { const old = S.shelfWare[shelfSel]; if (old) S.wares[old] = (S.wares[old] || 0) + 1; if (d.ware) { S.wares[d.ware]--; S.shelfWare[shelfSel] = d.ware; } else delete S.shelfWare[shelfSel]; dirty = true; renderShelf(); });
  bind('[data-a=take]', () => { add(s.g ? S.dishG : S.dish, s.key, s.n); s.n = 0; s.key = null; s.man = false; renderShelf(); });
  { const e = document.querySelector('#shq'); if (e) { const f = () => { cook.q2 = e.value; const q = e.value.trim(); document.querySelectorAll('.cell[data-nm]').forEach(x => x.style.display = !q || x.dataset.nm.includes(q) ? '' : 'none'); }; e.oninput = f; f(); } }
  bind('[data-a=resv]', () => openOrders());
  bind('.cell', d => {
    const g = d.g === '1';
    if (s.n && (s.key !== d.k || s.g !== g)) { add(s.g ? S.dishG : S.dish, s.key, s.n); s.n = 0; s.man = false; }
    const m = Math.min(5 - s.n, haveDish(d.k, g)); if (!m) return;
    takeDish(d.k, g, m); sfx('tick'); s.draft = true;
    if (!s.n) { const nb = S.nb[d.k + (g ? '*' : '')]; s.price = nb && nb.fair ? nb.fair : Math.round(dval(d.k, g) * (0.9 + Math.random() * .5)); }
    s.key = d.k; s.g = g; s.n += m; dirty = true; renderShelf();
  });
}

// ---------- inventory (Minecraft style)
// ===== v0.42: アイテムBOX（食材・料理・その他の3つの箱、絞り込み・並べ替え・検索・詳細）
let invTab = 'ing', invQ = '', invSel = null;
const INV_FIL = {ing:'all', dish:'all', oth:'all'}, INV_SORT = {ing:'dex', dish:'value', oth:'kind'};
const OTH_SRC = new Set(['potion', 'mregg', 'tmap', 'ore']);
const ING_CAT = [['all', 'すべて'], ['farm', '畑・果樹'], ['fish', '魚'], ['forage', '採集・薬草'], ['mine', '迷宮・魔物'], ['shop', '市場・町'], ['proc', '加工・熟成'], ['rare', '珍品・伝説'], ['gold', '金色']];
const ING_CATMAP = {seed:'farm', tree:'farm', hill:'farm', pier:'fish', pond:'fish', nushi:'fish', forage:'forage', herb:'forage', mine:'mine', deep:'mine', dungeon:'mine', market:'shop', merchant:'shop', town:'shop', proc:'proc', cellar:'proc', item:'proc', legend:'rare', night:'rare'};
const OTH_CAT = [['all', 'すべて'], ['gear', '装備'], ['tool', '道具'], ['seed', '種'], ['pot', '薬'], ['egg', '卵'], ['ore', '鉱石・宝石'], ['map', '地図']];
const SORT_N = {dex:'図鑑順', value:'値打ち順', count:'数の多い順', name:'名前順', kind:'種類順'};
const SORT_OPT = {ing:['dex', 'value', 'count', 'name'], dish:['value', 'count', 'name', 'dex'], oth:['kind', 'value', 'count', 'name']};
const ingCat = id => ING_CATMAP[ING[INGI[id]].src[0]] || 'proc';
const isOthIng = id => OTH_SRC.has(ING[INGI[id]].src[0]);
function othCatOf(c) { if (c.k === 'gear') return 'gear'; if (c.k === 't') return 'tool'; if (c.k === 's') return 'seed'; if (c.k === 'map') return 'map'; const s = ING[INGI[c.id]].src[0]; return s === 'potion' ? 'pot' : s === 'mregg' ? 'egg' : s === 'tmap' ? 'map' : 'ore'; }
function cellName(c) { return c.k === 'd' ? dishInfo(c.id).name : c.k === 's' ? ingName(c.id) + 'の種' : c.k === 't' ? TOOLI[toolInst(c.id).id].name : c.k === 'gear' ? gDef(gearOf(c.id)).name : c.k === 'map' ? '宝の地図' : ingName(c.id); }
function cellVal(c) { return c.k === 'd' ? dval(c.id, c.g) : c.k === 'gear' ? gearSellP(gearOf(c.id)) : c.k === 't' ? TOOLI[toolInst(c.id).id].price || 0 : c.k === 'map' ? 0 : ING[INGI[c.id]].value * (c.g ? 3 : 1); }
function dishMethods() { const m = new Set(); for (const k in S.dish) m.add(dishInfo(k).method); for (const k in S.dishG) m.add(dishInfo(k).method); return [...m]; }
function invCells() {
  const c = [];
  if (invTab === 'ing') { for (const id in S.invG) if (!isOthIng(id)) c.push({k:'i', id, g:true, n:S.invG[id]}); for (const id in S.inv) if (!isOthIng(id)) c.push({k:'i', id, g:false, n:S.inv[id]}); }
  else if (invTab === 'dish') { for (const k in S.dishG) c.push({k:'d', id:k, g:true, n:S.dishG[k]}); for (const k in S.dish) c.push({k:'d', id:k, g:false, n:S.dish[k]}); }
  else {
    for (const id in S.inv) if (isOthIng(id) && id !== 'tmap') c.push({k:'i', id, g:false, n:S.inv[id]}); for (const id in S.invG) if (isOthIng(id) && id !== 'tmap') c.push({k:'i', id, g:true, n:S.invG[id]});
    for (const id in S.seeds) c.push({k:'s', id, g:false, n:S.seeds[id]});
    const inBag = new Set(S.bag.filter(x => x && x.k === 't').map(x => x.uid)); for (const t of S.toolInv) if (t.dur > 0 && !inBag.has(t.uid)) c.push({k:'t', id:t.uid, g:false, n:1});
    if (S.gear) for (const g of gearSt().list) c.push({k:'gear', id:g.uid, g:false, n:1, r:g.r});
    if (S.tmap && S.tmap.maps.length) c.push({k:'map', id:'tmap', g:false, n:S.tmap.maps.length});
  }
  const f = INV_FIL[invTab], q = invQ.trim();
  let out = c.filter(x => {
    if (q && !cellName(x).includes(q)) return false;
    if (f === 'all') return true;
    if (invTab === 'ing') return f === 'gold' ? x.g : ingCat(x.id) === f;
    if (invTab === 'dish') return f === 'gold' ? x.g : f === 'mon' ? isMonDish(x.id) : f === 'ult' ? ULT_KEYS && ULT_KEYS.has(x.id) : dishInfo(x.id).method === f;
    return othCatOf(x) === f;
  });
  const s = INV_SORT[invTab], OK = ['gear', 'tool', 'seed', 'pot', 'egg', 'ore', 'map'];
  const dex = x => x.k === 'd' ? (x.id[0] === 'r' ? +x.id.slice(1) : 9999) : x.k === 'i' || x.k === 's' ? INGI[x.id] : 0;
  out.sort((a, b) => s === 'value' ? cellVal(b) - cellVal(a) : s === 'count' ? b.n - a.n : s === 'name' ? cellName(a).localeCompare(cellName(b), 'ja') :
    s === 'kind' ? OK.indexOf(othCatOf(a)) - OK.indexOf(othCatOf(b)) || (b.r || 0) - (a.r || 0) || dex(a) - dex(b) : dex(a) - dex(b) || b.g - a.g);
  return out;
}
const cellKey = c => `${c.k}:${c.id}:${c.g ? 1 : 0}`;
function invCellHTML(c) {
  const sel = invSel === cellKey(c) ? ' sel' : '';
  if (c.k === 'gear') { const g = gearOf(c.id), on = Object.values(gearSt().eq).includes(g.uid); return `<div class="cell r${g.r}${sel}" data-pick="${cellKey(c)}">${icHTML(gDef(g).icon, U * 11, 'atlas')}${on ? '<span class="eq">E</span>' : ''}</div>`; }
  if (c.k === 'map') return `<div class="cell${sel}" data-pick="${cellKey(c)}">${ingIc('tmap', U * 11, false, true)}<span class="n">${c.n}</span></div>`;
  const sl = c.k === 't' ? {k:'t', uid:c.id} : mkSlot(c.k, c.id, c.g, c.n);
  return `<div class="cell ${c.g ? 'gold' : ''}${sel}" data-pick="${cellKey(c)}" data-drag="store:${c.k}:${c.id}:${c.g ? 1 : 0}">${slotIcon(sl, U * 11)}</div>`;
}
function invDetail() {
  if (!invSel) return `<div class="idet empty">アイテムをタップすると、ここにくわしく出る</div>`;
  const [k, id_, g_] = invSel.split(':'), g = g_ === '1', id = k === 't' || k === 'gear' ? +id_ : id_;
  let ic = '', nm = '', info = '', btn = '';
  const mv = `<div class="btn grn" data-mv="stack">カバンへ</div><div class="btn" data-mv="one">1つだけ</div>`;
  if (k === 'i') { const it = ING[INGI[id]], n = (g ? S.invG : S.inv)[id] || 0; if (!n) { invSel = null; return invDetail(); }
    ic = ingIc(id, U * 16, g, true); nm = (g ? '金色の' : '') + it.name; info = `所持 <i style="font-style:normal;color:#ffe8c0;font-weight:700">${n}</i>　値打ち ${fmt(it.value * (g ? 3 : 1))}G<br>${srcText(it)}${it.desc ? '<br>' + it.desc : ''}`; btn = mv; }
  else if (k === 'd') { const n = (g ? S.dishG : S.dish)[id] || 0, d = dishInfo(id); if (!n) { invSel = null; return invDetail(); }
    ic = dishIcHTML(id, U * 16, g); nm = (g ? '金色の' : '') + d.name; info = `所持 <i style="font-style:normal;color:#ffe8c0;font-weight:700">${n}</i>　値打ち ${fmt(dval(id, g))}G　${mastStars(id)}${monTag(id)}<br>${d.method}：${d.ings.map(ingName).join('・')}`; btn = mv; }
  else if (k === 's') { const n = S.seeds[id] || 0; if (!n) { invSel = null; return invDetail(); } ic = icHTML(ING[INGI[id]].icon, U * 16, 'atlas'); nm = ingName(id) + 'の種'; info = `所持 <i style="font-style:normal;color:#ffe8c0;font-weight:700">${n}</i><br>${seasonText(id) || '旬：なし（一年中）'}`; btn = mv; }
  else if (k === 't') { const t = toolInst(id); if (!t) { invSel = null; return invDetail(); } const tl = TOOLI[t.id]; ic = icHTML(tl.icon, U * 16, 'atlas'); nm = tl.name; info = `耐久 ${t.dur}/${TOOL_DUR[t.id]}<br>${tl.desc}`; btn = '<div class="btn grn" data-mv="stack">カバンへ</div>'; }
  else if (k === 'gear') { const gg = gearOf(id); if (!gg) { invSel = null; return invDetail(); } const d = gDef(gg); ic = icHTML(d.icon, U * 16, 'atlas'); nm = `<span style="color:${RAR_C[gg.r]}">${isAcc(gg) ? '' : RAR_N[gg.r] + '・'}${d.name}</span>`;
    info = isAcc(gg) ? d.desc : `${WT_N[d.type]}／${WSUB[d.sub].n}　攻撃${wAtkVal(gg)}<br>効果：${[d.fx, ...gg.fx].filter(Boolean).map(x => (WFX[x] || x).split('：')[0]).join('・') || 'なし'}`; btn = '<div class="btn grn" data-mv="gear">くわしく・装備</div>'; }
  else if (k === 'map') { ic = ingIc('tmap', U * 16, false, true); nm = '宝の地図'; info = `${S.tmap.maps.length}枚：${S.tmap.maps.map(m => m.n).join('・')}`; btn = '<div class="btn grn" data-mv="map">地図を見る</div>'; }
  return `<div class="idet"><div class="idic">${ic}</div><div class="idt"><b>${nm}</b><span>${info}</span></div><div class="idb">${btn}</div></div>`;
}
function openInv() { modal('アイテムBOX', '<div id="invp"></div>', 'inv'); refreshInvPanel(); }
function refreshInvPanel() {
  const p = $('invp'); if (!p) return;
  const sc = p.querySelector('.store'), st = sc ? sc.scrollTop : 0;
  const nIng = Object.keys(S.inv).filter(id => !isOthIng(id)).length + Object.keys(S.invG).filter(id => !isOthIng(id)).length, nDish = Object.keys(S.dish).length + Object.keys(S.dishG).length;
  const tabs = [['ing', '🥕', '食材BOX', nIng], ['dish', '🍲', '料理BOX', nDish], ['oth', '📦', 'その他BOX', null]];
  const cats = invTab === 'ing' ? ING_CAT : invTab === 'dish' ? [['all', 'すべて'], ...dishMethods().map(m => [m, m]), ['gold', '金色'], ['mon', '魔物料理'], ['ult', '究極']] : OTH_CAT;
  const cells = invCells(), qm = S.ui && S.ui.qmove;
  p.innerHTML = `<div class="ibtabs">${tabs.map(([k, i, n, c]) => `<div class="${invTab === k ? 'on' : ''}" data-t="${k}"><span class="ii">${i}</span>${n}${c != null ? `<small>${c}</small>` : ''}</div>`).join('')}</div>
    <div class="ichips">${cats.map(([k, n]) => `<div class="${INV_FIL[invTab] === k ? 'on' : ''}" data-f="${k}">${n}</div>`).join('')}</div>
    <div class="itool"><input id="invq" placeholder="🔍 名前で探す" value="${invQ.replace(/"/g, '')}"><div class="btn" data-a="sort">並び：${SORT_N[INV_SORT[invTab]]}</div><div class="btn ${qm ? 'grn' : ''}" data-a="qm">${qm ? 'タップで移動' : 'タップで選ぶ'}</div></div>
    <div class="store" data-drop="store"><div class="grid">${cells.map(invCellHTML).join('') || '<div class="p">あてはまる物がない</div>'}</div></div>
    ${invDetail()}
    <div class="invsec">カバン <span style="color:var(--sub);font-weight:400">タップで箱へ戻す／長押しでドラッグ</span></div>
    <div class="bag">${S.bag.slice(8).map((sl, i) => `<div class="cell ${sl && sl.g ? 'gold' : ''}" data-drop="bag:${i + 8}" ${sl ? `data-drag="bag:${i + 8}" data-q="bag:${i + 8}"` : ''}>${slotIcon(sl, U * 11)}</div>`).join('')}</div>
    ${unl('mine') ? '<div class="btn big grn" data-a="gearopen" style="margin:3px 0">⚔ 装備（武器・指輪・首飾り）</div>' : ''}<div style="display:flex;gap:3px;margin:3px 0"><div class="btn" data-dep="bag" style="flex:1">カバンを全部箱へ</div><div class="btn" data-dep="all" style="flex:1">持ち物もカバンも箱へ<br><small>（道具は残す）</small></div></div>
    <div class="invsec">マイセット <span style="color:var(--sub);font-weight:400">持ち物とカバンの並びを保存して、いつでも呼び出せる</span></div>
    ${[0, 1, 2].map(i => { const st = (S.sets || [])[i]; return `<div class="row myset"><div class="t"><b>${st ? st.name : 'セット' + (i + 1)}</b><div class="msi">${st ? st.slots.map(x => x ? slotIcon(x, U * 6) : '').filter(Boolean).slice(0, 10).join('') || '（空っぽ）' : 'まだ保存していない'}</div></div><div style="display:flex;flex-direction:column;gap:2px"><div class="btn ${st ? 'grn' : 'dis'}" data-setload="${i}" style="padding:2px 6px">呼び出す</div><div class="btn" data-setsave="${i}" style="padding:2px 6px">今の並びを保存</div></div></div>`; }).join('')}`;
  const nsc = p.querySelector('.store'); if (nsc) nsc.scrollTop = st;
  p.querySelectorAll('[data-t]').forEach(el => el.onclick = () => { invTab = el.dataset.t; invSel = null; tut('ibox'); refreshInvPanel(); });
  p.querySelectorAll('[data-f]').forEach(el => el.onclick = () => { INV_FIL[invTab] = el.dataset.f; refreshInvPanel(); });
  { const q = p.querySelector('#invq'); q.oninput = () => { invQ = q.value; clearTimeout(q._t); q._t = setTimeout(() => { refreshInvPanel(); const q2 = $('invp').querySelector('#invq'); q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); }, 350); }; }
  p.querySelector('[data-a=sort]').onclick = () => { const o = SORT_OPT[invTab]; INV_SORT[invTab] = o[(o.indexOf(INV_SORT[invTab]) + 1) % o.length]; refreshInvPanel(); };
  p.querySelector('[data-a=qm]').onclick = () => { S.ui.qmove = !S.ui.qmove; dirty = true; refreshInvPanel(); };
  p.querySelectorAll('[data-pick]').forEach(el => el.onclick = e => { e.stopPropagation(); const key = el.dataset.pick, [k] = key.split(':');
    if (S.ui.qmove && ['i', 'd', 's', 't'].includes(k)) { quickMove('store:' + key); return; }
    if (invSel === key && ['i', 'd', 's', 't'].includes(k)) { quickMove('store:' + key); return; }   // 2回目のタップで移動
    invSel = key; sfx('tick'); refreshInvPanel(); });
  p.querySelectorAll('[data-mv]').forEach(el => el.onclick = () => { const m = el.dataset.mv, [k, id_, g_] = invSel.split(':');
    if (m === 'gear') return openGearDetail(+id_); if (m === 'map') return openTmList();
    if (m === 'one') { const st = storeOf(k, g_ === '1'); if (!st[id_]) return; add(st, id_, -1); const left = giveBag(k, id_, g_ === '1', 1); if (left) toast('持ち物もカバンもいっぱい。'); sfx('tick'); dirty = true; renderHot(); refreshInvPanel(); return; }
    quickMove('store:' + invSel); });
  p.querySelectorAll('[data-q]').forEach(el => el.onclick = e => { e.stopPropagation(); quickMove(el.dataset.q); });
  { const ge = p.querySelector('[data-a=gearopen]'); if (ge) ge.onclick = () => openGear(); }
  p.querySelectorAll('[data-dep]').forEach(el => el.onclick = () => { const all = el.dataset.dep === 'all'; let n = 0; for (let i = all ? 0 : 8; i < BAG_N; i++) { const sl = S.bag[i]; if (sl && sl.k !== 't') { depositSlot(i); n++; } } sfx(n ? 'ok' : 'tick'); toast(n ? `${n}枠ぶんを箱へしまった` : 'しまう物がない'); tut('myset'); renderHot(); refreshInvPanel(); });
  p.querySelectorAll('[data-setsave]').forEach(el => el.onclick = () => { const i = +el.dataset.setsave; if (!S.sets) S.sets = []; const old = S.sets[i];
    S.sets[i] = {name:old ? old.name : 'セット' + (i + 1), slots:S.bag.map(sl => sl ? JSON.parse(JSON.stringify(sl)) : null)}; dirty = true; sfx('ok'); toast(`${S.sets[i].name}に今の並びを保存した`); tut('myset'); refreshInvPanel(); });
  p.querySelectorAll('[data-setload]').forEach(el => el.onclick = () => loadMySet(+el.dataset.setload));
  p.querySelectorAll('.myset b').forEach((el, i) => el.onclick = () => { const st = (S.sets || [])[i]; if (!st) return; const nm = prompt('セットの名前（8文字まで）', st.name); if (nm) { st.name = nm.slice(0, 8); dirty = true; refreshInvPanel(); } });
}
function loadMySet(i) {
  const st = (S.sets || [])[i]; if (!st) return;
  for (let j = 0; j < BAG_N; j++) { const sl = S.bag[j]; if (sl && sl.k !== 't') depositSlot(j); }
  const short = [];
  st.slots.forEach((want, j) => { if (!want) return;
    if (want.k === 't') { const t = toolInst(want.uid); if (!t) return; const cur = S.bag.findIndex(x => x && x.k === 't' && x.uid === want.uid); if (cur === j) return; if (cur >= 0) S.bag[cur] = null; const other = S.bag[j]; S.bag[j] = {k:'t', uid:want.uid}; if (other && other.k === 't' && cur >= 0) S.bag[cur] = other; return; }
    if (S.bag[j]) return; const id = want.id || want.key, src = storeOf(want.k, want.g), n = Math.min(want.n, src[id] || 0);
    if (n > 0) { add(src, id, -n); S.bag[j] = mkSlot(want.k, id, want.g, n); } if (n < want.n) short.push((want.k === 'd' ? dishInfo(id).name : want.k === 's' ? ingName(id) + 'の種' : ingName(id)) + (n ? `（${n}/${want.n}）` : '（なし）')); });
  dirty = true; sfx('ok'); renderHot(); refreshInvPanel();
  toast(`${st.name}を呼び出した${short.length ? '<br>足りない物：' + short.slice(0, 4).join('、') + (short.length > 4 ? ' ほか' : '') : ''}`, short.length ? 4000 : 2000);
}
function parseSrc(src) { const a = src.split(':'); return a[0] === 'bag' ? {bag:+a[1]} : {k:a[1], id:a[1] === 't' ? +a[2] : a[2], g:a[3] === '1'}; }
function quickMove(src) {
  const p = parseSrc(src);
  if (p.bag != null) { depositSlot(p.bag); sfx('tick'); }
  else if (p.k === 't') { if (!giveTool(p.id)) toast('持ち物もカバンもいっぱい。'); else sfx('tick'); }
  else { const st = storeOf(p.k, p.g), n = Math.min(STACK, st[p.id] || 0); if (!n) return; add(st, p.id, -n); const left = giveBag(p.k, p.id, p.g, n); if (left) toast('持ち物もカバンもいっぱい。'); sfx('tick'); }
  dirty = true; renderHot(); refreshInvPanel();
}
function doDrop(src, dst) {
  const p = parseSrc(src);
  if (dst === 'store') { if (p.bag != null) depositSlot(p.bag); }
  else if (dst.startsWith('bag:')) {
    const j = +dst.slice(4);
    if (p.bag != null) {
      const i = p.bag; if (i === j) return;
      const a = S.bag[i], b = S.bag[j];
      if (sameItem(a, b)) { const m = Math.min(a.n, STACK - b.n); b.n += m; a.n -= m; if (a.n <= 0) S.bag[i] = null; }
      else { S.bag[i] = b; S.bag[j] = a; }
    } else if (p.k === 't') { if (S.bag[j]) depositSlot(j); S.bag[j] = {k:'t', uid:p.id}; }
    else {
      const st = storeOf(p.k, p.g), cnt = st[p.id] || 0; if (!cnt) return;
      const want = mkSlot(p.k, p.id, p.g, 0);
      if (S.bag[j] && !sameItem(S.bag[j], want)) depositSlot(j);
      const cur = S.bag[j], m = Math.min(cnt, STACK - (cur ? cur.n : 0)); if (m <= 0) return;
      add(st, p.id, -m); if (cur) cur.n += m; else { want.n = m; S.bag[j] = want; }
    }
  }
  dirty = true; sfx('tick'); renderHot(); refreshInvPanel();
}
// drag engine: hold 280ms to pick up, then drag; quick tap = normal click; quick swipe = scroll
let dg = null;
$('root').addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-drag]'); if (!el || busy) return;
  dg = {el, src:el.dataset.drag, x:e.clientX, y:e.clientY, active:false, free:!!el.closest('#hot')};
  dg.timer = setTimeout(() => activateDrag(), 200);
});
function activateDrag() {
    if (!dg || dg.active) return; const el = dg.el; dg.active = true; tipEat = true; dragDone = Date.now();
    const gh = document.createElement('div'); gh.className = 'ghost'; gh.innerHTML = el.innerHTML; gh.style.width = el.offsetWidth + 'px'; gh.style.height = el.offsetHeight + 'px';
    $('root').appendChild(gh); dg.ghost = gh; moveGhost(dg.x, dg.y);
    const tipEl_ = el.querySelector('[data-tip]'); if (tipEl_) showTip(el, tipEl_.dataset.tip);
    try { navigator.vibrate && navigator.vibrate(15); } catch (_) {}
}
let dragDone = 0;
window.addEventListener('click', e => { if (Date.now() - dragDone < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
function moveGhost(x, y) {
  const rr = $('root').getBoundingClientRect(); dg.ghost.style.left = (x - rr.left) + 'px'; dg.ghost.style.top = (y - rr.top) + 'px';
  document.querySelectorAll('.dropok').forEach(n => n.classList.remove('dropok'));
  const t = document.elementFromPoint(x, y); const d = t && t.closest('[data-drop]'); if (d) d.classList.add('dropok');
}
window.addEventListener('pointermove', e => {
  if (!dg) return;
  if (!dg.active) { const dx = e.clientX - dg.x, dy = e.clientY - dg.y; if (Math.hypot(dx, dy) > 7) { clearTimeout(dg.timer); if (dg.free || Math.abs(dx) > Math.abs(dy) * 1.1) activateDrag(); else { dg = null; return; } } else return; }
  moveGhost(e.clientX, e.clientY);
});
window.addEventListener('touchmove', e => { if (dg && dg.active) e.preventDefault(); }, {passive:false});
window.addEventListener('pointerup', e => {
  if (!dg) return; clearTimeout(dg.timer);
  if (dg.active) {
    const t = document.elementFromPoint(e.clientX, e.clientY), d = t && t.closest('[data-drop]');
    if (dg.ghost) dg.ghost.remove(); document.querySelectorAll('.dropok').forEach(n => n.classList.remove('dropok'));
    if (d && d.dataset.drop !== dg.src) { hideTip(); doDrop(dg.src, d.dataset.drop); }
    dragDone = Date.now();
  }
  dg = null;
});
window.addEventListener('pointercancel', () => { if (dg) { clearTimeout(dg.timer); if (dg.ghost) dg.ghost.remove(); dg = null; } });
const ZONE_N = {forest:'霧の森', beach:'月光の浜', river:'川辺と滝', flower:'花畑の丘', marsh:'霧の湿地', volcano:'火山のふもと', snow:'雪の高原', moon:'月光の森（夜）'};
function srcText(g) { if (g.src[0] === 'hill') return '丘の農地の' + ({goat:'ヤギ', sheep:'羊'}[g.src[1]] || '動物'); if (g.src[0] === 'mfarm') return '異界：鏡の畑（鏡の町ウラヤミ）'; if (g.src[0] === 'mregg') return g.id === 'egg_mix' ? '魔物牧場の掛け合わせ' : '迷宮・ダンジョンの魔物や宝箱（魔物牧場の解放後）'; if (g.src[0] === 'herb') return '魔物牧場の薬草畑'; if (g.src[0] === 'potion') return '魔物牧場の調合小屋'; if (g.src[0] === 'dungeon') { const G = DGD[g.src[1]]; return `専用ダンジョン「${G.n}」（${TOWNC[G.town].n}）の${G.bm === g.id ? 'ボス' : '魔物・岩・宝箱'}`; } if (g.src[0] === 'town') return '遠征：' + ((TOWNC[g.src[1]] || {}).n || '港町シオカゼ') + 'の市場'; if (g.src[0] === 'deep') return '奈落の深層（' + ({garden:'地底の庭', mist:'毒霧の階', vein:'鉱脈の階の岩', den:'魔物の巣の魔物'}[g.src[1]] || '') + '）'; if (g.src[0] === 'cellar') return '地下貯蔵庫で' + ingName(g.src[1]) + 'を熟成'; return ({forage:'採集：' + (ZONE_N[g.src[1]] || '') + 'で拾える', tree:'果樹園で実る', night:'裏営業の深夜の客が置いていく', mine:'地下迷宮で手に入る', ore:'地下迷宮で掘れる', seed:'畑で育つ', market:'市場で買える', pond:'生簀で釣れる', pier:'釣り桟橋で釣れる', proc:'キッチンの加工器具で作る', item:'たい肥箱で作る（畑で使う）', nushi:'ヌシ：' + ((NUSHI[g.src[1]] || {}).hint || '')}[g.src[0]] || '') + (FANTASY.has(g.id) ? '（温室が必要）' : '') + (g.src[0] === 'market' && PROC_OUT.has(g.id) ? '・加工器具でも作れる' : ''); }

// ---------- machines
const unitCost = id => { const g = ING[INGI[id]]; return g.src[0] === 'market' || g.src[0] === 'seed' ? g.src[1] : g.value; };
function procSave(r) { const g = ING[INGI[r.out]]; if (g.src[0] !== 'market') return ''; const mk = g.src[1], c = Math.max(1, Math.round(r.ins.reduce((a, x) => a + unitCost(x), 0) / r.n));
  return `<span style="display:block;color:#8ad08a;font-size:.85em">市場で1個 ${mk}G → 自分で作ると約${c}G（${Math.round((1 - c / mk) * 100)}%お得）</span>`; }
function openMachine(slot) {
  if (!unl('machines')) return gateMsg('machines');
  const m = MACH.find(x => x.slot === slot); if (!m) return;
  if (slot[0] === 'W' && !S.fac.workshop) return lockedMsg('workshop');
  const st = S.mach[m.id] || (S.mach[m.id] = {lv:0, q:[]});
  if (!st.lv) {
    modal(m.name, `<div class="result"><div class="p">${m.desc}</div><div class="p">作れる物：${m.recipes.map(r => ingName(r.out)).join('・')}</div></div><div class="btn big ${S.gold >= m.price ? 'grn' : 'dis'}" data-a="build">${fmt(m.price)}G で設置する</div>`, 'mach');
    bind('[data-a=build]', () => { if (S.gold < m.price) return; S.gold -= m.price; st.lv = 1; dirty = true; sfx('ok'); toast(`${m.name}を設置した！`); openMachine(slot); });
    return;
  }
  const cap = 2 + st.lv * 2, upC = Math.round(m.price * Math.pow(1.6, st.lv));
  let html = `<div class="p">${m.desc}。予約は${cap}件まで。留守中も動く。完成品は倉庫へ。</div>` + (S.staff.brewer ? `<div class="p" style="color:#8ad0c8">🤖 仕込み師が自動で仕込む物：<b>${st.auto != null && m.recipes[st.auto] ? ingName(m.recipes[st.auto].out) : 'なし'}</b>（加工法の「自動」で切り替え。空きがあれば20秒ごとに仕込む）</div>` : '');
  if (st.q.length) html += `<div class="h">加工中（${st.q.length}/${cap}）</div>` + st.q.map((j, k) => { const r = m.recipes[j.r]; return `<div class="row">${ingIc(r.out, U * 9, false, true)}<div class="t"><b>${ingName(r.out)}×${r.n}</b>${k === 0 ? `<div class="bar"><i style="width:${Math.round(100 * (j.t || 0) / r.sec)}%"></i></div>` : '<span>順番待ち</span>'}</div></div>`; }).join('');
  html += `<div class="h">加工法</div>`;
  m.recipes.forEach((r, ri) => {
    const lock = r.lv > st.lv, cnt = {}; r.ins.forEach(x => cnt[x] = (cnt[x] || 0) + 1);
    const hv = x => haveIng(x) + haveIng(x, true), miss = Object.keys(cnt).filter(x => hv(x) < cnt[x]), full = st.q.length >= cap;
    const ok = !lock && !miss.length && !full, buyC = miss.every(x => ING[INGI[x]].src[0] === 'market') ? miss.reduce((a, x) => a + ING[INGI[x]].src[1] * (cnt[x] - hv(x)), 0) : -1;
    html += `<div class="row">${ingIc(r.out, U * 11, false, true)}<div class="t"><b>${ingName(r.out)}×${r.n}${lock ? `　🔒Lv${r.lv}` : ''}</b>${procSave(r)}<span>${Object.keys(cnt).map(x => `<span class="chipin ${hv(x) >= cnt[x] ? 'ok' : 'ng'}">${ingName(x)}${cnt[x] > 1 ? '×' + cnt[x] : ''}（${hv(x)}）</span>`).join('')}　${r.sec}秒${lock ? '' : full ? '<br><span style="color:#d8806a">予約がいっぱい</span>' : miss.length ? `<br><span style="color:#d8806a">足りない：${miss.map(x => ingName(x) + '×' + (cnt[x] - hv(x)) + ({seed:'（畑で育てる・種は市場）', market:'（市場）', pier:'（釣り）', forage:'（採集）', tree:'（果樹）', proc:'（加工）'}[ING[INGI[x]].src[0]] || '')).join('・')}</span>` : ''}</span></div>${S.staff.brewer && !lock ? `<div class="btn ${st.auto === ri ? 'grn' : ''}" data-au="${ri}" style="font-size:.8em">🤖${st.auto === ri ? '自動中' : '自動'}</div>` : ''}${!lock && !full && miss.length && buyC >= 0 ? `<div class="btn ${S.gold >= buyC ? 'grn' : 'dis'}" data-rb="${ri}" style="font-size:.85em">買って仕込む<br>${fmt(buyC)}G</div>` : `<div class="btn ${ok ? '' : 'dis'}" data-r="${ri}">仕込む</div>${ok && st.q.length < cap - 1 ? `<div class="btn" data-rall="${ri}" style="font-size:.8em">あるだけ</div>` : ''}`}</div>`;
  });
  html += st.lv < 3 ? `<div class="row"><div class="t"><b>${m.name}を強化 Lv${st.lv}→${st.lv + 1}</b><span>加工が速くなり、予約枠と加工法が増える</span></div><div class="btn ${S.gold >= upC ? '' : 'dis'}" data-a="up">${fmt(upC)}G</div></div>` : '';
  modal(`${m.name} Lv${st.lv}`, html, 'mach');
  const takeAny = x => takeIng(x, false, 1) || takeIng(x, true, 1);
  bind('[data-au]', d => { st.auto = st.auto === +d.au ? null : +d.au; tut('m_brewer'); dirty = true; openMachine(slot); });
  bind('[data-rall]', d => { const r = m.recipes[+d.rall], c = {}; r.ins.forEach(x => c[x] = (c[x] || 0) + 1); let k = 0;
    while (st.q.length < cap && Object.keys(c).every(x => haveIng(x) + haveIng(x, true) >= c[x])) { r.ins.forEach(takeAny); st.q.push({r:+d.rall, t:0}); k++; }
    if (k) { sfx('tick'); dirty = true; toast(`${ingName(r.out)}を${k}回ぶん仕込んだ`); } openMachine(slot); });
  bind('[data-r]', d => { const r = m.recipes[+d.r]; if (st.q.length >= cap) return; const c = {}; r.ins.forEach(x => c[x] = (c[x] || 0) + 1); for (const x in c) if (haveIng(x) + haveIng(x, true) < c[x]) return; r.ins.forEach(takeAny); st.q.push({r:+d.r, t:0}); sfx('tick'); dirty = true; openMachine(slot); });
  bind('[data-rb]', d => { const r = m.recipes[+d.rb]; if (st.q.length >= cap) return; const c = {}; r.ins.forEach(x => c[x] = (c[x] || 0) + 1); let cost = 0; for (const x in c) { const l = c[x] - haveIng(x) - haveIng(x, true); if (l > 0) { if (ING[INGI[x]].src[0] !== 'market') return; cost += ING[INGI[x]].src[1] * l; } } if (S.gold < cost) return toast('お金が足りない');
    for (const x in c) { const l = c[x] - haveIng(x) - haveIng(x, true); if (l > 0) buyMarket(x, l); } r.ins.forEach(takeAny); st.q.push({r:+d.rb, t:0}); sfx('coin'); dirty = true; toast(`足りない材料を市場で買って仕込んだ（${fmt(cost)}G）`); openMachine(slot); });
  bind('[data-a=up]', () => { if (S.gold < upC) return; S.gold -= upC; st.lv++; sfx('ok'); dirty = true; openMachine(slot); });
}
// ---------- ranch & workshop
const FEEDS = ['wheat','corn','cabbage','carrot','potato','pumpkin','sweetpotato','rice'];
function openRanch(k) {
  if (!S.fac[k]) return lockedMsg(k);
  const isC = k === 'coop', n = isC ? S.fac.coop * 2 : S.fac.barn, aff = S.aff[isC ? 'chicken' : 'cow'] || 0;
  const per = isC ? 240 : 360;
  const html = `<div class="result"><div style="display:flex;justify-content:center;gap:${U * 2}px">${Array(n).fill(charHTML(isC ? 'chicken' : 'cow', U * 14)).join('')}</div>
    <div class="nm">${isC ? 'ニワトリ' : '牛'} ${n}${isC ? '羽' : '頭'}</div>
    <div class="p">${isC ? '卵' : '牛乳'}を1${isC ? '羽' : '頭'}あたり約${per / 60}分ごとにえさ1つで作る（倉庫へ）。</div>
    <div class="p">仲良し度 <b style="color:#e8b858">${'♥'.repeat(Math.min(10, Math.ceil(aff / 2)))}${'♡'.repeat(Math.max(0, 10 - Math.ceil(aff / 2)))}</b>（${aff}/20）<br>1日1回なでると上がる。高いほど金色の${isC ? '卵' : '牛乳'}や2個どりが増える。</div>
    <div class="p">えさ箱の残り：<b style="color:${S.feed > 0 ? '#8ad08a' : '#d8806a'}">${S.feed}</b>${S.feed <= 0 ? '（えさ切れ！）' : ''}</div></div>
    <div class="btn big" data-a="feed">えさ箱にえさを入れる</div>`;
  modal(isC ? '鶏小屋' : '牛舎', html, 'ranch');
  bind('[data-a=feed]', () => openFeed());
}
function openFeed() {
  if (!S.fac.coop && !S.fac.barn) return toast('🔒 えさ箱：「施設」で鶏小屋か牛舎を建てると使える。');
  const items = allIngs().filter(x => FEEDS.includes(x.id) && !x.g);
  const html = `<div class="p">作物1つでえさ2回分。いまの残り <b>${S.feed}</b>。農夫がいると倉庫の作物から自動で補充する。</div>` +
    (items.map(x => `<div class="row">${ingIc(x.id, U * 10)}<div class="t"><b>${ingName(x.id)}</b><span>所持 ${x.n}</span></div><div class="btn" data-f="${x.id}" data-n="1">×1</div><div class="btn ${x.n >= 5 ? '' : 'dis'}" data-f="${x.id}" data-n="5">×5</div></div>`).join('') || '<div class="p">えさになる作物（小麦・とうもろこし・キャベツ・にんじん・じゃがいも・かぼちゃ・さつまいも・米）がない。</div>');
  modal('えさ箱', html, 'feed');
  bind('[data-f]', d => { const n = Math.min(+d.n, haveIng(d.f)); if (!n) return; takeIng(d.f, false, n); S.feed += n * 2; sfx('pop'); dirty = true; openFeed(); });
}
function petAnimal(a) {
  const day = gday(), key = a.kind + a.i;
  if (S.petDay[key] === day) { sfx('tick'); return toast(a.kind === 'cow' ? 'モォ〜。満足そうだ。' : 'コッコッ。満足そうだ。', 1200); }
  S.petDay[key] = day; S.aff[a.kind] = Math.min(20, (S.aff[a.kind] || 0) + 1); sfx('ok'); dirty = true;
  floatAt(a.x, a.y - 14, '♥', ''); toast(`${a.kind === 'cow' ? '牛' : 'ニワトリ'}をなでた。仲良し度 ${S.aff[a.kind]}/20`, 1500);
}
function openWorkshop() {
  if (!S.fac.workshop) return lockedMsg('workshop');
  const ms = MACH.filter(m => m.slot[0] === 'W');
  const html = `<div class="p">時間のかかる加工をする工房。完成品は倉庫へ。留守中も動く。</div>` + ms.map(m => { const st = S.mach[m.id] || {};
    return `<div class="row"><div class="t"><b>${m.name}${st.lv ? ' Lv' + st.lv : ''}</b><span>${m.desc}${st.q && st.q.length ? `　加工中 ${st.q.length}件` : ''}</span></div><div class="btn ${st.lv ? '' : 'grn'}" data-m="${m.slot}">${st.lv ? '使う' : '設置'}</div></div>`; }).join('');
  modal('加工工房', html, 'workshop');
  bind('[data-m]', d => openMachine(d.m));
}
// ---------- compost & seed maker
function openCompost() {
  if (!S.fac.compost) return lockedMsg('compost');
  const cand = allIngs().filter(x => SEEDS.some(g => g.id === x.id) || x.g);
  const cre = allDishes().filter(x => x.k[0] === 'c');
  S.compostPt = S.compostPt || 0;
  let html = `<div class="p">余った作物や創作料理を入れると肥料になる。ためたポイント <b>${S.compostPt}</b>／4ごとに肥料1つ。金色の食材は高級肥料、幻想の作物は月光の灰になる。肥料は持ち物で選んで、育っている区画をタップしてまく。</div>`;
  html += cre.map(x => `<div class="row">${dishIcHTML(x.k, U * 10, x.g)}<div class="t"><b>${dishInfo(x.k).name}</b><span>×${x.n}　1つで2ポイント</span></div><div class="btn" data-d="${x.k}">入れる</div></div>`).join('');
  html += cand.map(x => `<div class="row">${ingIc(x.id, U * 10, x.g)}<div class="t"><b>${x.g ? '金色の' : ''}${ingName(x.id)}</b><span>×${x.n}　${x.g ? '→高級肥料' : FANTASY.has(x.id) ? '→月光の灰' : '1ポイント'}</span></div><div class="btn" data-i="${x.id}" data-g="${x.g ? 1 : 0}">入れる</div></div>`).join('') || '<div class="p">入れられる物がない。</div>';
  if (soilOn()) html = `<div class="btn ${S.compostPt >= 2 ? 'grn' : 'dis'}" data-a="soil" style="margin-bottom:${U}px">🟫 たい肥を畑にすき込む（2ポイント → 全部の区画の土+8）</div>` + html;
  modal('たい肥箱', html, 'compost');
  bind('[data-a=soil]', () => { if (S.compostPt < 2) return; S.compostPt -= 2; for (const i of PIDX()) { const p = S.plots[i]; p.soil = Math.min(100, soilV(p) + 8); } sfx('ok'); toast('🟫 畑全体にたい肥をすき込んだ（土+8）'); dirty = true; openCompost(); });
  const out = (id) => { giveBag('i', id, false, 1); toast(`${ingName(id)}ができた！（持ち物かカバンへ）`, 1500); };
  bind('[data-d]', d => { if (!takeDish(d.d, false, 1)) return; S.compostPt += 2; while (S.compostPt >= 4) { S.compostPt -= 4; out('fert1'); } sfx('pop'); openCompost(); });
  bind('[data-i]', d => { const g = d.g === '1'; if (!takeIng(d.i, g, 1)) return; if (g) out('fert2'); else if (FANTASY.has(d.i)) out('fert3'); else { S.compostPt += 1; while (S.compostPt >= 4) { S.compostPt -= 4; out('fert1'); } } sfx('pop'); openCompost(); });
}
function openShed() {
  let html = `<div class="btn big" data-a="plant">種を植える</div>` + (unl('breed') ? `<div style="height:calc(var(--u)*1.4)"></div><div class="btn big blu" data-a="breed">🧪 交配台（品種改良）</div>` : '');
  if (S.fac.seedmaker) {
    const crops = allIngs().filter(x => !x.g && SEEDS.some(g => g.id === x.id));
    html += `<div class="h">種子づくり機（作物1個→種2個）</div>` + (crops.map(x => `<div class="row">${ingIc(x.id, U * 10)}<div class="t"><b>${ingName(x.id)}</b><span>所持 ${x.n}　種 ${haveSeed(x.id)}</span></div><div class="btn" data-s="${x.id}">種にする</div></div>`).join('') || '<div class="p">作物がない。</div>');
  } else html += `<div class="row"><div class="t"><b>🔒 種子づくり機</b><span>「施設」で設置（${fmt(FAC.seedmaker.cost(0))}G）すると、作物から種が作れる</span></div></div>`;
  modal('道具小屋', html, 'shed');
  bind('[data-a=plant]', () => openPlant(null));
  bind('[data-a=breed]', () => openBreed());
  bind('[data-s]', d => { if (!takeIng(d.s, false, 1)) return; add(S.seeds, d.s, 2); sfx('pop'); openShed(); });
}
// ---------- recipes
function openRecipes() {
  const known = Object.keys(S.known.r).map(Number).sort((a, b) => a - b);
  const learned = REC.map((r, i) => i).filter(i => S.learned[i] && !S.known.r[i]);
  const near = Object.keys(S.near).map(Number).filter(i => !S.known.r[i] && !S.learned[i]);
  const cre = Object.keys(S.creative);
  let html = `<div class="p">作ったレシピ ${known.length} / ${REC.length}　覚えたレシピ ${learned.length}　創作料理 ${cre.length}</div>
    <div class="row">${icHTML(D.bookIcon, U * 11)}<div class="t"><b>レシピ本</b><span>外の市場の「本」で買える。読むとまとめてレシピを覚える</span></div></div>
    <div class="row"><div class="t"><b>レシピのヒントを買う</b><span>未発見のレシピの調理法と食材を1つ教えてもらう。続けて買うと同じレシピの食材がもう1つわかる（最後の1つは自分で）</span></div><div class="btn ${S.gold >= hintCost() ? '' : 'dis'}" data-a="hint">${hintCost()}G</div></div>
    ${unl('airec') ? `<div class="btn big blu" data-a="airec" style="margin-bottom:calc(var(--u)*1.4)">📖 オリジナルレシピ図鑑・🧪試作台</div>` : ''}`;
  html += wishHTML();
  if (S.hint && S.hint.ing && !S.hint.ings) S.hint.ings = [S.hint.ing];
  if (S.hint != null && !S.known.r[S.hint.ri] && !S.learned[S.hint.ri]) { const r = REC[S.hint.ri]; html += `<div class="row">${icHTML(r.icon, U * 11, 'sil')}<div class="t"><b>ヒント：？？？（${r.ings.length}品・${r.method}）</b><span>わかっている食材：${S.hint.ings.map(ingName).join('・')}${S.hint.ings.length < r.ings.length - 1 ? '<br>もう一度買うと、食材がもう1つわかる' : '<br>残りの1つは自分で探そう'}</span></div></div>`; }
  if (learned.length) html += `<div class="h">覚えたレシピ（まだ作っていない）</div>` + learned.map(ri => { const r = REC[ri];
    return `<div class="row">${icHTML(r.icon, U * 11, 'atlas', null, 'r:' + ri)}<div class="t"><b>${r.name}</b><span>${r.method}：${ingChips(r, true)}</span></div>${wishStar(ri)}</div>`; }).join('');
  if (near.length) html += `<div class="h">惜しかった組み合わせ</div>` + near.map(ri => { const r = REC[ri];
    return `<div class="row">${icHTML(r.icon, U * 11, 'sil')}<div class="t"><b>？？？（${r.method}・${r.ings.length}品）</b><span>使ったことのある食材：${r.ings.filter(isKnown).map(ingName).join('・') || 'なし'}</span></div></div>`; }).join('');
  html += `<div class="h">作ったレシピ（スイッチ＝料理人に作らせる）</div>`;
  html += known.map(ri => { const r = REC[ri]; const on = S.menu[ri] !== false;
    return `<div class="row">${icHTML(r.icon, U * 11, 'atlas', null, 'r:' + ri)}<div class="t"><b>${r.name}${monTag('r' + ri)} ${mastStars('r' + ri)}</b><span>${r.method}：${r.ings.map(ingLabel).join('・')}　${fmt(dval('r' + ri))}G</span></div>${wishStar(ri)}${S.staff.cook ? `<div class="btn" data-cap="${ri}" style="font-size:.8em;min-width:${U * 9}px">上限<br>${(S.capR || {})[ri] || '∞'}</div>` : ''}<div class="sw ${on ? 'on' : ''}" data-ri="${ri}"><i></i></div></div>`; }).join('') || '<div class="p">まだない。かまどの「レシピ帳」から作ってみよう。</div>';
  if (cre.length) html += `<div class="h">創作料理</div>` + cre.map(k => { const c = S.creative[k]; return `<div class="row">${dishIcHTML(k, U * 11)}<div class="t"><b>${c.name}</b><span>${c.method}：${c.ings.map(ingLabel).join('・')}　${fmt(c.value)}G</span></div></div>`; }).join('');
  modal('レシピ', html, 'rec');
  bind('[data-a=airec]', () => openAiRecs());
  bind('[data-ri]', d => { S.menu[d.ri] = S.menu[d.ri] === false; dirty = true; openRecipes(); });
  bind('[data-wl]', d => { wishToggle(+d.wl); openRecipes(); });
  bind('[data-cap]', d => { S.capR = S.capR || {}; const seq = [0, 3, 5, 10, 20, 40], c = S.capR[d.cap] || 0, nx = seq[(seq.indexOf(c) + 1) % seq.length]; if (nx) S.capR[d.cap] = nx; else delete S.capR[d.cap]; tut('m_cap'); dirty = true; openRecipes(); });
  bind('[data-wx]', d => { wishVer++; delete wishL()[d.wx]; dirty = true; openRecipes(); });
  bind('[data-wn]', d => { wishVer++; const [ri, v] = d.wn.split(':').map(Number), w = wishL(); w[ri] = Math.max(1, Math.min(99, (w[ri] || 1) + v)); dirty = true; openRecipes(); });
  bind('[data-a=hint]', () => {
    const H = S.hint && !S.known.r[S.hint.ri] && !S.learned[S.hint.ri] ? S.hint : null, cost = hintCost();
    if (S.gold < cost) return toast('お金が足りない。');
    if (H && H.ings.length < REC[H.ri].ings.length - 1) { const rest = REC[H.ri].ings.filter(x => !H.ings.includes(x)); H.ings.push(pick(rest)); }
    else { const un = REC.map((r, i) => i).filter(i => !S.known.r[i] && !S.learned[i] && !SECRET_R.has(i)); if (!un.length) return; const ri = S.near && Object.keys(S.near).map(Number).find(i => !S.known.r[i] && !S.learned[i] && !SECRET_R.has(i)); const r2 = ri != null && Math.random() < .5 ? ri : pick(un); S.hint = {ri:r2, ings:[pick(REC[r2].ings)]}; }
    S.gold -= cost; sfx('coin'); dirty = true; openRecipes();
  });
}
function learnRecipes(idxs) { let n = 0; for (const i of idxs) if (i >= 0 && !S.learned[i] && !S.known.r[i]) { S.learned[i] = true; n++; } dirty = true; return n; }
const TIER = {1:['入門','#8a8496'], 2:['普通','#4fae5a'], 3:['専門','#3f86d9'], 4:['秘伝','#9b59d6'], 5:['禁書','#e3a72a']};
function bookStock() { const d = gday(), SPB = {mon1:'monster', nt1:'night', bio1:'season', bio2:'mine', bio3:'night', age1:'cellar', deep1:'abyss'}, rare = D.books.filter(b => b.tier >= 3 && b.tier <= 4 && !SPB[b.id]); const r = [...rare].sort((a, b) => ((a.id.charCodeAt(1) * 31 + d * 17) % 7) - ((b.id.charCodeAt(1) * 31 + d * 17) % 7)).slice(0, 2).map(b => b.id); return new Set(D.books.filter(b => SPB[b.id] ? unl(SPB[b.id]) || S.books[b.id] : b.tier <= 2 || b.tier === 5 || r.includes(b.id) || S.books[b.id]).map(b => b.id)); }
function openBooks() {
  const stock = bookStock();
  let html = mkSeg() + '<div class="p">本を読むと載っている料理のレシピを覚える。入門・普通の本はいつでも、<b>専門・秘伝の本は日替わりで2冊</b>だけ入荷する。本に載っていない秘密のレシピもある。</div>';
  for (const b of D.books) {
    if (!stock.has(b.id)) continue;
    const own = S.books[b.id], lock = b.req === 'greenhouse' ? !S.fac.greenhouse : b.req === 'rank2' ? rankIdx() < 2 : false;
    const idx = b.recipes.map(n => REC.findIndex(r => r.name === n)); const newN = idx.filter(i => !S.learned[i] && !S.known.r[i]).length;
    const [tn, tc] = TIER[b.tier];
    html += `<div class="row" style="border-left:${U}px solid ${tc}">${icHTML(D.bookIcon, U * 11)}<div class="t"><b>『${b.name}』 <span style="color:${tc};font-size:.8em">${tn}</span></b><span>${b.desc}　${b.recipes.length}品${own ? '' : `（新しく覚える ${newN}品）`}${lock ? `　🔒${b.req === 'greenhouse' ? '温室が必要' : '店の格「評判の店」以上'}` : ''}</span></div>${own ? '<div class="btn dis">読了</div>' : `<div class="btn ${S.gold >= b.price && !lock ? '' : 'dis'}" data-book="${b.id}">${fmt(b.price)}G</div>`}</div>`;
  }
  const hidden = D.books.filter(b => !stock.has(b.id)).length;
  if (hidden) html += `<div class="p">ほかに ${hidden} 冊の専門・秘伝の本がある。明日また来てみよう。</div>`;
  modal('霧月通りの市場', html, 'market');
  bind('[data-t]', d => { mkTab = d.t; openMarket(); });
  bind('[data-book]', d => { const b = D.books.find(x => x.id === d.book); if (S.gold < b.price) return; S.gold -= b.price; S.books[b.id] = true;
    const n = learnRecipes(b.recipes.map(nm => REC.findIndex(r => r.name === nm))); sfx('ok'); toast(`『${b.name}』を読んだ。レシピを${n}品覚えた！ かまどの「レシピ帳」から作れる。`, 4000); openBooks(); });
}
// ---------- dex
let dexTab = 'dish';
function openDex() {
  const nI = Object.keys(S.known.i).filter(k => !isItem(k)).length, nR = Object.keys(S.known.r).length;
  let body;
  if (dexTab === 'dish') body = `<div class="grid">${REC.map((r, i) => `<div class="cell" data-r="${i}">${icHTML(r.icon, U * 13, S.known.r[i] || nrDexR(i) ? 'atlas' : 'sil', null, 'r:' + i)}</div>`).join('')}</div>`;
  else if (dexTab === 'proc') { const ps = ING.filter(g => g.src[0] === 'proc' || PROC_OUT.has(g.id));
    body = `<div class="p">加工器具で作れる物。${ps.filter(g => isKnown(g.id)).length}/${ps.length}</div><div class="grid">${ps.map(g => `<div class="cell" data-i="${INGI[g.id]}">${ingIc(g.id, U * 13)}</div>`).join('')}</div>`; }
  else if (dexTab === 'ore') { if (!S.mine) mineState(); const don = S.mine.donated, ores = ING.filter(g => isOre(g.id)), nd = ores.filter(g => don[g.id]).length;
    body = `<div class="p">掘った鉱石・宝石を1つずつ寄贈すると図鑑が埋まる。寄贈 ${nd}/${ores.length}（5・10・全種で記念の報酬）</div><div class="grid">${ores.map(g => `<div class="cell ${don[g.id] ? 'gold' : ''}" data-o="${g.id}">${ingIc(g.id, U * 13)}${don[g.id] ? '<span class="n">✓</span>' : ''}</div>`).join('')}</div>`; }
  else if (dexTab === 'reg') body = regDexHTML();
  else if (dexTab === 'diary') body = diaryHTML();
  else if (dexTab === 'ach') { body = medalHTML() + achHTML(); tut('medal'); }
  else if (dexTab === 'kiwa') body = kiwaHTML();
  else if (dexTab === 'mon') body = monDexHTML();
  else if (dexTab === 'gear') body = gearDexHTML();
  else if (dexTab === 'fish') { tut('m_fishcond'); const R_ = S.fishRec || {}, secs = [['生簀', POND], ['桟橋', PIER.filter(g => FSZ[g.id] && !['shrimp','scallop'].includes(g.id))], ['地底湖', LAKE.map(id => ING[INGI[id]])], ['ヌシ', ['nushi_pond','nushi_pier','nushi_lake'].map(id => ING[INGI[id]])]];
    const all = secs.flatMap(x => x[1]), nC = all.filter(g => R_[g.id]).length;
    body = `<div class="p">釣った魚の最大サイズ。★は小・中・大のサイズ段階（初めての段階で報酬）。${nC}/${all.length}</div>` + secs.map(([n, list]) => `<div class="h">${n}</div>` + list.map(g => { const r = R_[g.id], hint = g.src[0] === 'nushi' ? NUSHI[g.src[1]].hint : (TACKLE.find(t => t.fav[g.id]) || {}).n;
      return `<div class="row">${icHTML(g.icon, U * 11, r ? 'atlas' : 'sil', null, 'i:' + g.id)}<div class="t"><b>${r ? g.name : g.src[0] !== 'nushi' && ingObtainable(g.id) ? g.name + ' <span style="color:var(--sub);font-weight:normal">まだ釣っていない</span>' : '？？？'}</b><span>${r ? `最大 ${r.max.toFixed(1)}cm　${[1, 2, 3].map(k => r.st & (1 << (k - 1)) ? '★' : '☆').join('')}<br>` : ''}${fishCond(g)}</span></div></div>`; }).join('')).join(''); }
  else body = `<div class="grid">${ING.map((g, i) => isItem(g.id) ? '' : `<div class="cell" data-i="${i}">${ingIc(g.id, U * 13)}</div>`).join('')}</div>`;
  compCheck();
  modal('図鑑', `${compRateHTML()}<div class="seg many"><div class="${dexTab === 'dish' ? 'on' : ''}" data-t="dish">料理 ${nR}/${REC.length}</div><div class="${dexTab === 'ing' ? 'on' : ''}" data-t="ing">食材 ${nI}/${ING.filter(g => !isItem(g.id)).length}</div>${unl('machines') ? `<div class="${dexTab === 'proc' ? 'on' : ''}" data-t="proc">加工品</div>` : ''}${unl('mine') ? `<div class="${dexTab === 'ore' ? 'on' : ''}" data-t="ore">鉱石</div>` : ''}${unl('fishing') ? `<div class="${dexTab === 'fish' ? 'on' : ''}" data-t="fish">釣り</div>` : ''}${unl('regulars') ? `<div class="${dexTab === 'reg' ? 'on' : ''}" data-t="reg">常連</div>` : ''}${unl('story') ? `<div class="${dexTab === 'diary' ? 'on' : ''}" data-t="diary">日記</div>` : ''}${unl('kiwami') ? `<div class="${dexTab === 'kiwa' ? 'on' : ''}" data-t="kiwa">極み</div>` : ''}${unl('guild') ? `<div class="${dexTab === 'mon' ? 'on' : ''}" data-t="mon">魔物</div>` : ''}${unl('arms') ? `<div class="${dexTab === 'gear' ? 'on' : ''}" data-t="gear">装備</div>` : ''}${unl('ach') ? `<div class="${dexTab === 'ach' ? 'on' : ''}" data-t="ach">実績</div>` : ''}</div>${body}`, 'dex');
  bind('[data-story]', d => { const r = REGI[d.story], st = regOf(r.id); popStory(`<div class="tst">${charHTML(r.k, U * 22)}<div><div class="tth">${r.name}</div><div class="hearts">${'♥'.repeat(st.lv)}${'♡'.repeat(5 - st.lv)}</div></div></div><div class="ttx">${r.story[st.lv - 1]}</div>`); });
  bind('[data-t]', d => { dexTab = d.t; openDex(); }); bindDiary(); if (dexTab === 'ach') bindAch();
  bind('[data-r]', (d, el) => showTip(el, 'r:' + d.r));
  bind('[data-o]', (d, el) => { const M = mineState(); if (M.donated[d.o]) return showTip(el, 'i:' + d.o); if (!haveIng(d.o)) return showTip(el, 'i:' + d.o);
    takeIng(d.o, false, 1); M.donated[d.o] = true; const nd = Object.keys(M.donated).length, tot = ING.filter(g => isOre(g.id)).length; sfx('ok');
    let msg = `${ingName(d.o)}を寄贈した（${nd}/${tot}）`; const rw = {5:2000, 10:8000}[nd] || (nd === tot ? 30000 : 0); if (rw) { S.gold += rw; S.rep = Math.min(100, S.rep + 5); msg += `<br>🏆 記念の報酬 ${fmt(rw)}G と評判アップ！`; }
    toast(msg, 3500); openDex(); });
  bind('[data-i]', (d, el) => showTip(el, 'i:' + ING[d.i].id));
}

// ---------- facilities
function openFac() {
  let html = '<div class="btn big" data-forge="1" style="margin-bottom:calc(var(--u)*2)">⚒ 鍛冶屋ガルド（ツルハシ・武器・防具・器）</div>';
  html += unl('decor') ? '<div class="btn big" data-decor="1" style="margin-bottom:calc(var(--u)*2)">🛋 内装を変える</div>' : '';
  if (unl('place')) html += '<div class="btn big" data-plc="1" style="margin-bottom:calc(var(--u)*2)">🪑 飾りを自由に置く</div>';
  html += unl('expand') ? '<div class="h">🔨 店の拡張（条件を満たすと順に解放）</div>' : '';
  for (const k in FAC) { if (FAC[k].grp !== 'ext' || !unl('expand') || (FAC[k].gate && !unl(FAC[k].gate))) continue; const f = FAC[k], lv = S.fac[k] || 0;
    if (!lv && !facReqOk(k)) { html += `<div class="row" style="opacity:.55"><div class="t"><b>🔒 ${f.name}</b><span>${f.desc}<br>解放の条件：${facReqText(k)}</span></div></div>`; continue; }
    const mx = lv >= f.max, c = mx ? 0 : f.cost(lv), need = mx ? null : facOre(k, lv), ok = S.gold >= c && (!need || needOk(need));
    html += `<div class="row"><div class="t"><b>${f.name}　Lv${lv}${mx ? '（最大）' : ''}</b><span>${f.desc}${need ? '<br>建材：' + needHTML(need) : ''}</span></div>${mx ? '' : `<div class="btn ${ok ? '' : 'dis'}" data-k="${k}">${lv ? '強化' : '建てる'}<br>${fmt(c)}G</div>`}</div>`; }
  html += branchHTML();
  html += '<div class="h">店と農場の施設</div>';
  for (const k in FAC) { if (FAC[k].grp === 'ext') continue;
    if (FAC[k].gate && !unl(FAC[k].gate)) { html += `<div class="row" style="opacity:.5"><div class="t"><b>🔒 ${FAC[k].name}</b><span>左上の目標を進めると解放される</span></div></div>`; continue; }
    const f = FAC[k], lv = S.fac[k], mx = lv >= f.max, c = mx ? 0 : f.cost(lv), need = mx ? null : facOre(k, lv);
    const ok = S.gold >= c && (!need || needOk(need));
    html += `<div class="row"><div class="t"><b>${f.name}　Lv${lv}${mx ? '（最大）' : ''}</b><span>${f.desc}${need ? '<br>建材：' + needHTML(need) : ''}</span></div>${mx ? '' : `<div class="btn ${ok ? '' : 'dis'}" data-k="${k}">${lv ? '強化' : '設置'}<br>${fmt(c)}G</div>`}</div>`;
  }
  if (typeof norenFacHTML === 'function') html += norenFacHTML();
  html += saveFacHTML();
  html += `<div class="h">データの引き継ぎ</div><div class="row"><div class="t"><b>別の端末で続きを遊ぶ</b><span>今のデータをコードにして、別の端末やブラウザで読み込める</span></div></div><div class="row"><div class="btn" data-a="xout">コードを作る</div><div class="btn" data-a="xin">コードで読み込む</div></div><div class="h">設定</div><div class="row"><div class="t"><b>移動ボタンを表示</b><span>十字キー。タップした場所への自動移動はいつでも使える</span></div><div class="sw ${S.ui.pad ? 'on' : ''}" data-a="pad"><i></i></div></div>
    <div class="row"><div class="t"><b>BGM</b><span>夜の酒場の環境音楽と暖炉の音</span></div><div class="sw ${S.ui.bgm ? 'on' : ''}" data-a="bgm"><i></i></div></div>
    <div class="row"><div class="t"><b>文字の大きさ</b><span>画面の文字やボタンの大きさ</span></div><div style="display:flex;gap:2px">${[[.9, '小'], [1, '中'], [1.15, '大']].map(([v, n]) => `<div class="btn ${uiFs() === v ? 'grn' : ''}" data-fs="${v}" style="padding:2px 8px">${n}</div>`).join('')}</div></div>
    <div class="row"><div class="t"><b>お知らせの表示時間</b><span>画面上に出るお知らせが消えるまでの長さ（消えたお知らせは📋の履歴で読める）</span></div><div style="display:flex;gap:2px">${[[.7, '短い'], [1, '普通'], [1.6, '長い']].map(([v, n]) => `<div class="btn ${uiToastMul() === v ? 'grn' : ''}" data-tm="${v}" style="padding:2px 6px">${n}</div>`).join('')}</div></div>
    <div class="row"><div class="t"><b>場面の切り替えを速く</b><span>暗転の時間を短くする</span></div><div class="sw ${S.ui.fast ? 'on' : ''}" data-a="fast"><i></i></div></div>
    <div class="row"><div class="t"><b>効果音</b><span>収穫・会計・扉などの音</span></div><div class="sw ${S.ui.se ? 'on' : ''}" data-a="se"><i></i></div></div><div class="row"><div class="t"><b>最初からやり直す</b><span>セーブを消して最初から始める</span></div><div class="btn red" data-a="reset">${resetArm ? 'もう一度押す' : 'リセット'}</div></div>`;
  modal('施設', html, 'fac');
  bindBranch(); bind('[data-a=noren]', () => openNoren()); bind('[data-a=savenow]', () => { SV.readOnly = SV.other ? SV.readOnly : false; saveNow(true); toast(SV.err ? '⚠ ' + SV.err : '💾 セーブした', 2000); openFac(); }); bind('[data-a=bak]', () => openBackups());
  bind('[data-decor]', () => openDecor()); bind('[data-plc]', () => openPlace()); bind('[data-forge]', () => openForgeHut());
  bind('[data-k]', d => {
    const f = FAC[d.k], c = f.cost(S.fac[d.k]), need = facOre(d.k, S.fac[d.k]); if (S.gold < c || (need && !needOk(need))) return;
    if (need) for (const [k, n] of Object.entries(need)) takeIng(k, false, n);
    S.gold -= c; S.fac[d.k]++; if (S.fac[d.k] === 1) tut('fac_' + d.k); syncShelf(); buildActors(); dirty = true; sfx('ok'); toast(`${f.name}を Lv${S.fac[d.k]} にした！`); openFac();
  });
  bind('[data-a=xout]', () => openTransfer('out')); bind('[data-a=xin]', () => openTransfer('in'));
  bind('[data-a=pad]', () => { S.ui.pad = !S.ui.pad; applyPad(); dirty = true; openFac(); });
  bind('[data-a=bgm]', () => { S.ui.bgm = !S.ui.bgm; initAudio(); applyAudio(); dirty = true; openFac(); });
  bind('[data-fs]', d => { S.ui.fs = +d.fs; layout(); dirty = true; openFac(); });
  bind('[data-tm]', d => { S.ui.tm = +d.tm; dirty = true; openFac(); });
  bind('[data-a=fast]', () => { S.ui.fast = !S.ui.fast; dirty = true; openFac(); });
  bind('[data-a=se]', () => { S.ui.se = !S.ui.se; initAudio(); applyAudio(); dirty = true; openFac(); });
  bind('[data-a=reset]', () => { if (!resetArm) { resetArm = true; openFac(); setTimeout(() => resetArm = false, 3000); return; } try { rotateBak(serialize()); } catch (e) {} S = fresh(); syncShelf(); resetArm = false; saveNow(true); location.reload(); });
}
let resetArm = false;
function facOre(k, lv) {   // ore building materials for higher levels
  const t = {cellar:{0:{iron:6}, 1:{silver:4, gold:2}, 2:{emerald:2}}, kitchen:{1:{iron:6}, 2:{silver:4, gold:2}, 3:{emerald:2}, 4:{diamond:2}}, upstairs:{0:{iron:8}, 1:{silver:5}, 2:{gold:4}, 3:{emerald:3}, 4:{diamond:3, moonstone:1}}, terrace:{1:{amethyst:2}, 2:{sapphire:2}, 3:{diamond:2}}, bar:{1:{ruby:1}, 2:{emerald:2}, 3:{moonstone:2}}, inn:{2:{sapphire:1, gold:3}, 3:{diamond:2}, 4:{moonstone:3}}, courtyard:{0:{iron:10}, 1:{silver:6}, 2:{emerald:2}}, bath:{0:{gold:6}, 1:{sapphire:3}, 2:{diamond:3}}, orchard:{0:{iron:4}}, hearth:{3:{iron:5}, 4:{iron:8, gold:2}}, shelf:{2:{silver:3}, 3:{silver:5, gold:2}}, sprinkler:{2:{amethyst:3, iron:4}},
             plots:{4:{iron:4}, 5:{iron:6, silver:2}, 6:{gold:3}}, sign:{3:{ruby:1}, 4:{sapphire:1, emerald:1}}, pond:{2:{silver:3}}, bee:{2:{gold:2}}}[k];
  return t && t[lv] ? t[lv] : null;
}

// ---------- staff
function staffCost(k) { return Math.round(STAFF[k].base * Math.pow(1.7, S.staff[k])); }
function openStaff() {
  if (!unl('staff')) return gateMsg('staff');
  let html = `<div class="p">雇った従業員は、アプリを閉じている間も働きます（最大8時間分）。</div>`;
  for (const k in STAFF) {
    if (k === 'brewer' && !unl('machines')) continue;
    const s = STAFF[k], n = S.staff[k], mx = n >= s.max, c = staffCost(k);
    const idle = n && k === 'cook' && S.idle && S.idle.cook ? `<span style="color:#d8806a">⚠ 待機中：${S.idle.cook}</span>` : n && k === 'clerk' && !S.auto.sell ? '<span style="color:#d8806a">⚠ 自動販売がOFF</span>' : '';
    html += `<div class="row">${charHTML(s.icon, U * 13)}<div class="t"><b>${s.name}　${n}人</b><span>${s.desc}</span>${idle}</div>${mx ? '<div class="btn dis">満員</div>' : `<div class="btn ${S.gold >= c ? '' : 'dis'}" data-k="${k}">雇う<br>${fmt(c)}G</div>`}</div>`;
  }
  if (S.staff.miner && S.mine && S.mine.ever) { const ev = ROCKS.filter(k => k !== 'stone' && S.mine.ever[k]);
    html += `<div class="h">採掘人に頼む鉱石</div><div class="p">選んだ鉱石を多めに（7割）掘ってくる。「おまかせ」は行ったことのある階からいろいろ。</div><div style="display:flex;flex-wrap:wrap;gap:${U * .6}px;margin-bottom:${U * 1.4}px"><div class="btn ${!S.mineAim ? 'grn' : ''}" data-aim="">おまかせ</div>${ev.map(k => `<div class="btn ${S.mineAim === k ? 'grn' : ''}" data-aim="${k}">${ingName(k)}</div>`).join('')}</div>`; }
  html += `<div class="h">働き方</div>
   <div class="row"><div class="t"><b>自動仕入れ</b><span>料理人・農夫が足りない材料（市場の品）や種を自動で買う</span></div><div class="sw ${S.auto.buy ? 'on' : ''}" data-a="buy"><i></i></div></div>
   <div class="row"><div class="t"><b>自動販売</b><span>店員が料理を棚に並べ、値段を決める（店員が必要）</span></div><div class="sw ${S.auto.sell ? 'on' : ''}" data-a="sell"><i></i></div></div>
   <div class="row"><div class="t"><b>値付けの方針</b><span>強気＝単価↑客↓　安売り＝客と評判↑</span></div><div class="btn" data-a="mode">${{strong:'強気', normal:'通常', cheap:'安売り'}[S.auto.mode]}</div></div>
   <div class="p">料理人に作らせる料理は「レシピ」タブのスイッチで選べます。</div>`;
  html += '<div class="h">従業員のレベル</div>' + staffHTML();
  modal('従業員', html, 'staff');
  bind('[data-aim]', d => { S.mineAim = d.aim || null; dirty = true; toast(d.aim ? `採掘人は${ingName(d.aim)}を多めに掘る` : '採掘人はおまかせで掘る'); openStaff(); });
  bind('[data-meal]', () => { let best = null; for (const k in S.dish) if (S.dish[k] > 0 && (!best || dval(k) < dval(best))) best = k; if (!best) return toast('倉庫に料理がない'); add(S.dish, best, -1); S.mealT = S.t + 1800; for (const k in STAFF) for (let i = 0; i < S.staff[k]; i++) eXp(k, i, 3); sfx('ok'); toast(`まかないに${dishInfo(best).name}をふるまった。みんな元気いっぱい！`); openStaff(); });
  bindTrain();
  bind('[data-kp]', d => { S.keepN = +d.kp; dirty = true; openStaff(); });
  bind('[data-bp]', d => { S.buyPct = +d.bp; S.budget = null; budget(); dirty = true; openStaff(); });
  bind('[data-perk]', d => { const [k, i, tier, id] = d.perk.split('|'); const e = S.emp[k][+i]; if (+tier === 0) e.p5 = id; else e.p10 = id; sfx('ok'); dirty = true; openStaff(); });
  bind('[data-k]', d => { const c = staffCost(d.k); if (S.gold < c) return; if (d.k === 'miner' && !(S.mine && S.mine.max)) return toast('地下迷宮に一度入ると雇えるようになる。'); if (d.k === 'brewer' && !MACH.some(m => S.mach[m.id] && S.mach[m.id].lv)) return toast('加工器具を1つ置くと雇えるようになる。'); S.gold -= c; S.staff[d.k]++; syncEmp(); if (S.staff[d.k] === 1) tut('st_' + d.k); if (d.k === 'clerk' && S.staff.clerk === 1) S.auto.sell = true; buildActors(); dirty = true; toast(`${STAFF[d.k].name}を雇った！`); openStaff(); });
  bind('[data-a]', d => { if (d.a === 'buy') S.auto.buy = !S.auto.buy; else if (d.a === 'sell') { if (!S.staff.clerk) return toast('店員が必要です'); S.auto.sell = !S.auto.sell; } else S.auto.mode = {normal:'strong', strong:'cheap', cheap:'normal'}[S.auto.mode]; dirty = true; chips(); openStaff(); });
}

// ---------- brewery
function openBrew() { return openMachine('A'); }
function openBrew_old() {
  if (!S.fac.brew) return lockedMsg('brew');
  modal('醸造樽', `<div class="p">90秒ごとに自動で仕込みます。</div>
   <div class="row">${icHTML(INGI.soysauce, U * 11)}<div class="t"><b>醤油</b><span>大豆＋塩　（所持 ${S.inv.soysauce || 0}）</span></div></div>
   ${S.fac.brew >= 2 ? `<div class="row">${icHTML(INGI.miso, U * 11)}<div class="t"><b>味噌</b><span>大豆＋塩＋米　（所持 ${S.inv.miso || 0}）</span></div></div>` : ''}
   <div class="p">材料の在庫：大豆 ${S.inv.soy || 0}　塩 ${S.inv.salt || 0}　米 ${S.inv.rice || 0}</div>`, 'brew');
}

// ---------- market
let mkTab = 'seed';
function openSell() {
  const items = allIngsAll().filter(x => isOre(x.id) || ING[INGI[x.id]].src[0] === 'mine');
  let html = mkSeg() + '<div class="p">宝石商が鉱石・宝石・迷宮の素材を買い取ってくれる。鍛冶や器づくりに使う分は残しておこう。</div>' +
    (items.map(x => { const g = ING[INGI[x.id]], p = isOre(x.id) ? g.value : Math.round(g.value * .6);
      return `<div class="row">${ingIc(x.id, U * 10)}<div class="t"><b>${g.name}</b><span>所持 ${x.n}　1つ ${fmt(p)}G</span></div><div class="btn" data-s="${x.id}" data-n="1">1つ</div><div class="btn" data-s="${x.id}" data-n="${x.n}">全部</div></div>`; }).join('') || '<div class="p">売れる物がない。地下迷宮で掘ってこよう。</div>');
  modal('霧月通りの市場', html, 'market');
  bind('[data-t]', d => { mkTab = d.t; openMarket(); });
  bind('[data-s]', d => { const g = ING[INGI[d.s]], n = Math.min(+d.n, haveIng(d.s)), p = isOre(d.s) ? g.value : Math.round(g.value * .6); if (!n) return; takeIng(d.s, false, n); S.gold += p * n; sfx('coin'); toast(`${g.name}×${n} を ${fmt(p * n)}G で売った。`, 1500); openSell(); });
}
function allIngsAll() {
  const m = {};
  for (const id in S.inv) m[id] = 1; for (const sl of S.bag) if (sl && sl.k === 'i' && !sl.g) m[sl.id] = 1;
  return Object.keys(m).map(id => ({id, n:haveIng(id)})).filter(x => x.n > 0).sort((a, b) => INGI[a.id] - INGI[b.id]);
}
let mkN = 1;
function openMarket() {
  if (mkTab === 'fish') return openFishMarket();
  if (mkTab === 'sell') return openSell();
  if (mkTab === 'trade') return openTrade();
  if (mkTab === 'tool') return openTools();
  if (mkTab === 'book') return openBooks();
  const need = wishNeed(), wn = g => mkTab === 'seed' ? wishSeedNeed(g.id) : (need[g.id] ? Math.max(0, need[g.id] - haveAnyIng(g.id)) : -1);
  const list = (mkTab === 'seed' ? SEEDS.filter(g => (!FANTASY.has(g.id) || S.fac.greenhouse) && !HYBS.has(g.id)) : MARKET).slice().sort((a, b) => (need[b.id] ? 1 : 0) - (need[a.id] ? 1 : 0));
  const short = mkTab === 'food' ? Object.keys(need).filter(id => ING[INGI[id]].src[0] === 'market' && haveAnyIng(id) < need[id]).map(id => [id, need[id] - haveAnyIng(id)]) : [];
  const shortC = short.reduce((a, [id, n]) => a + ING[INGI[id]].src[1] * n, 0);
  const html = mkSeg() + mkNHTML() +
    (short.length ? `<div class="btn big ${S.gold >= shortC ? 'grn' : 'dis'}" data-wbuy="1" style="margin-bottom:${U * 1.4}px">📝 作るリストの足りない分をまとめて買う（${short.map(([id, n]) => ingName(id) + '×' + n).join('・')}　${fmt(shortC)}G）</div>` : '') +
    (mkTab === 'seed' && !S.fac.greenhouse ? '<div class="p">温室を建てると、幻想の作物の種も並ぶ。</div>' : '') +
    list.map(g => { const p = g.src[1]; const own = mkTab === 'seed' ? (S.seeds[g.id] || 0) : (S.inv[g.id] || 0);
      const shown = isKnown(g.id) || (mkTab === 'seed' && S.seeds[g.id]);
      return `<div class="row">${ingIc(g.id, U * 11, false, shown)}<div class="t"><b>${need[g.id] ? '<i style="font-style:normal;color:#ffd860">★ </i>' : ''}${g.name}${mkTab === 'seed' ? 'の種' : ''}</b><span>${p}G　所持 ${own}${need[g.id] ? `　<span style="color:${wn(g) > 0 ? '#ffd860' : '#8ad08a'}">作るリスト：${wn(g) > 0 ? 'あと' + wn(g) + '個' : 'そろった'}（必要${need[g.id]}・手持ち${haveAnyIng(g.id)}・料理人は使わない）</span>` : ''}${shown ? '' : '　<span style="color:#e8c060">まだ使ったことがない</span>'}</span></div><div class="btn ${S.gold >= p * mkN ? '' : 'dis'}" data-id="${g.id}" data-n="${mkN}">×${mkN}<br>${fmt(p * mkN)}G</div></div>`; }).join('');
  modal('霧月通りの市場', html, 'market');
  bind('[data-t]', d => { mkTab = d.t; openMarket(); });
  bind('.btn[data-id]', d => {
    const g = ING[INGI[d.id]], n = +d.n, c = g.src[1] * n; if (S.gold < c) return;
    S.gold -= c; add(mkTab === 'seed' ? S.seeds : S.inv, d.id, n); if (mkTab !== 'seed') S.known.i[d.id] = true; sfx('coin'); openMarket();
  });
  bindMkN(openMarket);
  bind('[data-wbuy]', () => { if (S.gold < shortC) return; for (const [id, n] of short) buyMarket(id, n); sfx('coin'); toast('作るリストの足りない食材をまとめて買った（倉庫へ）'); openMarket(); });
}
// 買う数（−＋と、1・5・10）
function mkNHTML() { return `<div style="display:flex;align-items:center;gap:${U * .8}px;margin-bottom:${U * 1.4}px;flex-wrap:wrap"><span>買う数</span><div class="btn" data-mn="-10">−10</div><div class="btn" data-mn="-1">−</div><b style="min-width:${U * 8}px;text-align:center;font-size:1.2em">${mkN}</b><div class="btn" data-mn="1">＋</div><div class="btn" data-mn="10">＋10</div>${[1, 10, 50, 100].map(n => `<div class="btn ${mkN === n ? 'grn' : ''}" data-ms="${n}">${n}</div>`).join('')}</div>`; }
function bindMkN(re) { bind('[data-mn]', d => { mkN = Math.max(1, Math.min(999, mkN + +d.mn)); re(); }); bind('[data-ms]', d => { mkN = +d.ms; re(); }); }

// v0.54 朝の魚市（6〜10時）：日替わりで魚・貝・エビなどが5品。値打ち×1.5（釣るほうが安い）
const FM_POOL = ['ayu','trout','catfish','eel','carp','smelt','aji','saba','salmon','tai','tuna','squid','shrimp','octopus','scallop','iwashi','sanma','buri','hirame','katsuo','uni','asari','crab','oyster','sazae','wakame','river_shrimp','sawagani'].filter(id => INGI[id] != null);
const FM_RARE = ['misteel','abyssfish'].filter(id => INGI[id] != null);
const fmOpen = () => { const h = hmNow(); return h >= 360 && h < 600; };
function fmStock() {
  if (S.fm && S.fm.d === gday()) return S.fm;
  const w = id => { const g = ING[INGI[id]]; return typeof g.src[1] === 'number' ? g.src[1] : 15; };
  const pool = FM_POOL.slice(), it = [];
  while (it.length < 5 && pool.length) { const tot = pool.reduce((a, id) => a + w(id) * (inSeason(id) ? 1.8 : 1), 0); let r = Math.random() * tot, k = 0; for (; k < pool.length - 1; k++) { r -= w(pool[k]) * (inSeason(pool[k]) ? 1.8 : 1); if (r <= 0) break; } const id = pool.splice(k, 1)[0]; it.push({id, n:2 + Math.floor(Math.random() * 4)}); }
  if (FM_RARE.length && Math.random() < .12) it.push({id:pick(FM_RARE), n:1, rare:1});
  return (S.fm = {d:gday(), it});
}
function openFishMarket() {
  tut('m_fishmk'); const st = fmStock(), open = fmOpen();
  const html = mkSeg() + `<div class="p">🐟 朝の魚市：毎朝6時〜10時だけ。日替わりで魚・貝・エビなどが並ぶ（値打ちの1.5倍。自分で釣るほうが安い）。</div>` + (open ? mkNHTML() + st.it.map((x, i) => { const g = ING[INGI[x.id]], p = Math.round(g.value * 1.5), m = Math.min(mkN, x.n);
    return `<div class="row">${ingIc(x.id, U * 11, false, true)}<div class="t"><b>${x.rare ? '<i style="font-style:normal;color:#e8c060">珍 </i>' : ''}${g.name}${inSeason(x.id) ? ' <span style="color:#8ad08a;font-weight:normal">旬</span>' : ''}</b><span>${p}G　残り${x.n}　所持 ${haveAnyIng(x.id)}</span></div><div class="btn ${x.n > 0 && S.gold >= p * m ? '' : 'dis'}" data-fm="${i}">×${m}<br>${fmt(p * m)}G</div></div>`; }).join('')
    : `<div class="p" style="color:#d8806a">今は閉まっている。明日の朝6時に、また新しい魚が並ぶ。</div>`);
  modal('霧月通りの市場', html, 'market');
  bind('[data-t]', d => { mkTab = d.t; openMarket(); }); bindMkN(openFishMarket);
  bind('[data-fm]', d => { if (!fmOpen()) return openFishMarket(); const x = st.it[+d.fm], g = ING[INGI[x.id]], p = Math.round(g.value * 1.5), m = Math.min(mkN, x.n); if (!m || S.gold < p * m) return; S.gold -= p * m; x.n -= m; add(S.inv, x.id, m); S.known.i[x.id] = true; sfx('coin'); dirty = true; openFishMarket(); });
}

function mkSeg() { return `<div class="seg">${[['seed','種'],['food','食材'],['fish','🐟魚市'],['tool','道具'],['book','本'],['sell','買取'],['trade','相場']].filter(x => (x[0] !== 'fish' || unl('fishing')) && (x[0] !== 'sell' || unl('mine')) && (x[0] !== 'trade' || unl('trade'))).map(([k, n]) => `<div class="${mkTab === k ? 'on' : ''}" data-t="${k}">${n}</div>`).join('')}</div>`; }
const MK_POTS = ['p_heal', 'p_heal2', 'p_stam'];
function openTools() {
  let html = mkSeg() + '<div class="p">道具には耐久力がある。使うたびに減り、0になると壊れて使えなくなる（無くならない）。ここでの修理は新品の半額×減った分。<b>鍛冶屋ガルド（古井戸の下の小屋・施設タブ）なら、その4割の値段で修理できる。</b></div>';
  if (S.toolInv.length) {
    html += '<div class="h">持っている道具</div>';
    for (const t of S.toolInv) { const tl = TOOLI[t.id], mx = TOOL_DUR[t.id], c = Math.max(1, Math.round(tl.price * .5 * (1 - t.dur / mx))) || 0, r = t.dur / mx;
      html += `<div class="row">${icHTML(tl.icon, U * 11, 'atlas', null, 't:' + tl.id)}<div class="t"><b>${tl.name}</b><span>耐久 ${t.dur}/${mx}${S.bag.some(x => x && x.k === 't' && x.uid === t.uid) ? '' : '（倉庫）'}</span><div class="bar"><i style="width:${r * 100}%"></i></div></div>${t.dur < mx && tl.price ? `<div class="btn ${S.gold >= c ? '' : 'dis'}" data-rep="${t.uid}">修理<br>${fmt(c)}G</div>` : ''}</div>`; }
  }
  if (unl('mine')) html += `<div class="row">${ingIc('scroll', U * 11, false, true)}<div class="t"><b>帰還の巻物</b><span>迷宮からすぐ地上へ戻れる。帰り道のおまけで拾った物が2割増え、「帰還の印」で次はその階から再開できる。倒れそうな時は自動で使われる（所持 ${haveIng('scroll')}）</span></div><div class="btn ${S.gold >= 120 ? '' : 'dis'}" data-scroll="1">120G</div></div>`;
  if (unl('dungeon')) { html += '<div class="h">薬（調合小屋で作るほうが安い）</div>'; for (const id of MK_POTS) { const p = ING[INGI[id]].value * 3; html += `<div class="row">${ingIc(id, U * 11, false, true)}<div class="t"><b>${ingName(id)}</b><span>${ING[INGI[id]].desc || ''}（所持 ${haveIng(id)}）</span></div><div class="btn ${S.gold >= p ? '' : 'dis'}" data-bpot="${id}:1">×1<br>${fmt(p)}G</div><div class="btn ${S.gold >= p * 5 ? '' : 'dis'}" data-bpot="${id}:5">×5</div></div>`; } }
  if (unl('forage')) html += `<div class="row">${ingIc('bait', U * 11, false, true)}<div class="t"><b>エサ</b><span>かご罠に使う（所持 ${haveIng('bait')}）</span></div><div class="btn ${S.gold >= 50 ? '' : 'dis'}" data-bait="10">×10<br>50G</div></div>
    <div class="row">${charHTML('trap', U * 11)}<div class="t"><b>かご罠</b><span>生簀や海岸に仕掛けると放置で獲物が獲れる（手持ち ${S.trapItems || 0}）</span></div><div class="btn ${S.gold >= 300 ? '' : 'dis'}" data-trap="1">300G</div></div>`;
  if (unl('fishing')) html += '<div class="h">釣り具（エサは消耗品、ルアーは使用回数あり。釣り画面の右上で付け替え）</div>';
  if (unl('fishing')) for (const t of TACKLE) html += `<div class="row">${tkIcon(t.id, U * 11)}<div class="t"><b>${t.n}</b><span>${t.bait ? 'エサ' : 'ルアー'}　狙い：${t.desc}（所持 ${tkHave(t.id)}${t.bait ? '' : '回'}）</span></div><div class="btn ${S.gold >= t.price * (t.pack || 1) ? '' : 'dis'}" data-tk="${t.id}">${t.bait ? '×' + t.pack + '<br>' + fmt(t.price * t.pack) : t.uses + '回<br>' + fmt(t.price)}G</div></div>`;
  const KN = {hoe:'クワ（持って空き区画をタップ＝まとめて植える）', can:'ジョウロ（持って作物をタップ＝水やり）', rod:'釣り竿（ないと釣れない）', sickle:'鎌（まとめて収穫）', pick:'ツルハシ（地下迷宮で岩を掘る）', sword:'剣（地下迷宮の魔物と戦う。買った剣は「装備」に入る）'};
  const M = mineState();
  for (const kind of ['can', 'hoe', 'rod', 'sickle', 'pick', 'sword']) {
    if ((kind === 'rod' && !unl('fishing')) || ((kind === 'pick' || kind === 'sword') && !unl('mine'))) continue;
    html += `<div class="h">${KN[kind]}</div>`;
    for (const t of TOOLS.filter(x => x.kind === kind)) {
      const price = t.price || 80, lock = t.unlock && !M.ever[t.unlock];
      if (lock && TOOLS.filter(x => x.kind === kind && x.unlock && !M.ever[x.unlock]).indexOf(t) > 0) continue;
      html += `<div class="row" style="${lock ? 'opacity:.55' : ''}">${icHTML(t.icon, U * 11, lock ? 'sil' : 'atlas', null, 't:' + t.id)}<div class="t"><b>${lock ? '🔒 ' : ''}${t.name}</b><span>${lock ? `${ingName(t.unlock)}を地下迷宮で掘り出すと入荷` : t.desc + '　耐久 ' + TOOL_DUR[t.id]}</span></div>${lock ? '' : `<div class="btn ${S.gold >= price ? '' : 'dis'}" data-tool="${t.id}">${fmt(price)}G</div>`}</div>`;
    }
  }
  modal('霧月通りの市場', html, 'market');
  bind('[data-t]', d => { mkTab = d.t; openMarket(); });
  bind('[data-tool]', d => { const t = TOOLI[d.tool], price = t.price || 80; if (S.gold < price) return; S.gold -= price; if (t.kind === 'sword') { addGear('onehand_' + MAT_ORDER[t.tier - 1], 0); dirty = true; sfx('coin'); openTools(); return; } newTool(t.id); dirty = true; sfx('coin'); toast(`${t.name}を買った！ 空きがあれば持ち物かカバンに入る（なければ倉庫へ）。`); openTools(); });
  bind('[data-bait]', d => { const n = +d.bait, c = n * 5; if (S.gold < c) return; S.gold -= c; add(S.inv, 'bait', n); S.known.i.bait = true; sfx('coin'); openTools(); });
  bind('[data-trap]', () => { if (S.gold < 300) return; S.gold -= 300; S.trapItems = (S.trapItems || 0) + 1; sfx('coin'); toast('かご罠を買った。農場の生簀か海岸に仕掛けよう。'); openTools(); });
  bind('[data-tk]', d => { const t = TKI[d.tk], c = t.price * (t.pack || 1); if (S.gold < c) return; S.gold -= c; S.tackle[t.id] = tkHave(t.id) + (t.bait ? t.pack : t.uses); if (!S.tkSel) S.tkSel = t.id; dirty = true; sfx('coin'); openTools(); });
  bind('[data-bpot]', d => { const [id, n] = d.bpot.split(':'), c = ING[INGI[id]].value * 3 * +n; if (S.gold < c) return; S.gold -= c; add(S.inv, id, +n); S.known.i[id] = true; sfx('coin'); toast(`${ingName(id)}×${n}を買った（倉庫へ。迷宮では画面上の「🧪薬」から使う）`); openTools(); });
  bind('[data-scroll]', () => { if (S.gold < 120) return; S.gold -= 120; giveBag('i', 'scroll', false, 1); sfx('coin'); openTools(); });
  bind('[data-rep]', d => { const t = S.toolInv.find(x => x.uid === +d.rep), tl = TOOLI[t.id], c = Math.max(1, Math.round(tl.price * .5 * (1 - t.dur / TOOL_DUR[t.id]))); if (S.gold < c) return; S.gold -= c; t.dur = TOOL_DUR[t.id]; if (!S.bag.some(x => x && x.k === 't' && x.uid === t.uid)) giveTool(t.uid); renderHot(); dirty = true; openTools(); });
}
// ---------- tooltips (long press)
let tipEl = null, tipTimer = null, tipStart = null, tipShownAt = 0, tipEat = false;
function showTip(el, t) {
  hideTip(); if (!t) return;
  tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.innerHTML = tipText(t); $('root').appendChild(tipEl);
  const rr = $('root').getBoundingClientRect(), er = el.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  let x = er.left - rr.left + er.width / 2 - tw / 2, y = er.top - rr.top - th - 6;
  if (y < U * 19) y = er.bottom - rr.top + 6;
  x = Math.max(4, Math.min(rr.width - tw - 4, x)); tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  tipShownAt = Date.now(); const me = tipEl; setTimeout(() => { if (tipEl === me) hideTip(); }, 4500);
}
function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }
$('root').addEventListener('pointerdown', e => {
  tipEat = false; if (tipEl && Date.now() - tipShownAt > 200) hideTip();
  const el = e.target.closest('[data-tip]'); if (!el || e.target.closest('[data-drag]')) return;
  tipStart = [e.clientX, e.clientY];
  clearTimeout(tipTimer); tipTimer = setTimeout(() => { showTip(el, el.dataset.tip); tipEat = true; tipStart = null; }, 420);
}, true);
['pointerup', 'pointercancel'].forEach(ev => $('root').addEventListener(ev, () => { clearTimeout(tipTimer); }, true));
$('root').addEventListener('pointermove', e => { if (tipStart && Math.hypot(e.clientX - tipStart[0], e.clientY - tipStart[1]) > 10) clearTimeout(tipTimer); }, true);
$('root').addEventListener('click', e => { if (tipEat) { tipEat = false; e.stopPropagation(); e.preventDefault(); } }, true);
$('root').addEventListener('contextmenu', e => e.preventDefault());
// ---------- orders
function openOrders() {
  if (!unl('orders')) return gateMsg('orders');
  refillOrders();
  let rs = '';
  if (S.resv) { const d = dishInfo(S.resv.key), have = haveDish(S.resv.key);
    rs = `<div class="h">🍷 宴会の予約</div><div class="row">${dishIcHTML(S.resv.key, U * 11)}<div class="t"><b>${d.name} ×${S.resv.n}</b><span>${S.resv.who}　報酬 ${fmt(S.resv.reward)}G＋評判　あと${fmtLeft(S.resv.due - S.t)}　手持ち ${have}</span></div><div class="btn ${have >= S.resv.n ? 'grn' : 'dis'}" data-rs="1">届ける</div></div><div class="h">住民の依頼</div>`; }
  const rv = (S.reviews || []).length ? `<div class="h">📰 評論家の記事</div>` + S.reviews.map(r => `<div class="row"><div class="t"><b>${r.stars ? '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars) + '　' + r.name : '空振り'}</b><span>${r.text}</span></div></div>`).join('') : '';
  const rr = S.ordRr !== gday();
  const html = contestHTML() + rs + `<div class="p">住民からの特別な注文。<b>①書いてある料理を作る → ②棚に並べずに「届ける」</b>（作った直後の画面からも届けられる）。報酬は通常の2倍。${rr ? '<br>作れそうにない依頼は、1日1回だけ「入れ替え」できる。' : ''}</div>` + S.orders.map((o, i) => {
    const r = REC[o.ri], have = haveDish('r' + o.ri), kn = S.known.r[o.ri] || S.learned[o.ri];
    return `<div class="row">${icHTML(r.icon, U * 11, kn ? 'atlas' : 'sil')}<div class="t"><b>${r.name} ×${o.n}${kn ? '' : '<span style="color:#e8c060;font-weight:normal">（まだ作ったことがない）</span>'}</b><span>${recHint(o.ri)}<br>${o.who}より　報酬 ${fmt(o.reward)}G　手持ち ${have}/${o.n}</span></div><div style="display:flex;flex-direction:column;gap:${U * .8}px"><div class="btn ${have >= o.n ? 'grn' : 'dis'}" data-i="${i}">届ける</div>${rr && have < o.n ? `<div class="btn" data-rr="${i}" style="font-size:.85em">入れ替え</div>` : ''}</div></div>`;
  }).join('');
  const auc = unl('auction') ? `<div class="btn big" data-a="auc" style="margin-bottom:${U * 1.4}px">🔨 行商人の競り：${aucLot().d}${S.aucPre && S.aucPre.wk === monthKey() ? `（${fmt(S.aucPre.b)}G 預け中）` : S.aucDone === monthKey() ? '（今週は終了）' : '（入札を預けられる）'}</div>` : '';
  modal('依頼の掲示板', auc + ooHTML() + html + rv, 'orders'); ooBind(openOrders); bind('[data-a=auc]', () => openAuction());
  bind('[data-contest]', () => openContest());
  bind('[data-rs]', () => { const r = S.resv; if (!r || haveDish(r.key) < r.n) return; takeDish(r.key, false, r.n); S.gold += r.reward; S.rep = Math.min(100, S.rep + repGain(5) * repDim()); S.resv = null; S.resvT = 1500; sfx('ok'); toast(`宴会は大成功！ ${fmt(r.reward)}G を受け取った。`); openOrders(); });
  bind('[data-i]', d => deliverOrder(+d.i, openOrders));
  bind('[data-rr]', d => { if (S.ordRr === gday()) return; S.ordRr = gday(); S.orders.splice(+d.rr, 1); refillOrders(); sfx('tick'); toast('📜 依頼を1つ入れ替えた（次は明日から）。'); openOrders(); });
}

// ---------- fishing (v0.9): cast → bite → reel (+ tension for ヌシ) → catch cut
const TACKLE = [
  {id:'worm', n:'ミミズ', bait:1, price:5, pack:10, desc:'川魚（アユ・ニジマス）・盲魚', fav:{ayu:3, trout:3, blindfish:2.5}},
  {id:'dough', n:'練りエサ', bait:1, price:8, pack:10, desc:'ナマズ・ウナギ／生簀のヌシ', fav:{catfish:3, eel:3}},
  {id:'ebi', n:'エビエサ', bait:1, price:15, pack:10, desc:'タイ・サバ・タコ', fav:{tai:3, saba:2.5, octopus:2}},
  {id:'glow', n:'光る虫', bait:1, price:30, pack:5, desc:'霧ウナギ・盲魚・奈落魚／地底湖のヌシ', fav:{misteel:4, blindfish:3, eel:2, abyssfish:2}},
  {id:'spoon', n:'スプーン', price:200, uses:40, desc:'アジ・サバ・イカ', fav:{aji:3, saba:3, squid:2.5}},
  {id:'minnow', n:'ミノー', price:450, uses:60, desc:'サケ・ニジマス／大きめが掛かる', fav:{salmon:3, trout:2}, size:.15},
  {id:'jig', n:'深海用ジグ', price:1200, uses:80, desc:'マグロ・奈落魚（遠投向き）', fav:{tuna:4, abyssfish:3}},
  {id:'phantom', n:'幻の疑似餌', price:3000, uses:30, desc:'ヌシ専用。普通の魚は掛かりにくい', fav:{}, nushi:1},
];
const TKI = {}; TACKLE.forEach((t, i) => { t.i = i; TKI[t.id] = t; });
const FSZ = {ayu:[12,30], trout:[20,60], catfish:[25,90], eel:[35,100], misteel:[50,120], aji:[12,40], saba:[25,50], salmon:[45,95], tai:[25,80], tuna:[90,260], squid:[15,45], shrimp:[8,22], octopus:[30,90], scallop:[8,18], abyssfish:[60,160], blindfish:[10,32], carp:[30,100], smelt:[8,15], iwashi:[10,25], sanma:[25,40], buri:[60,120], hirame:[40,100], katsuo:[50,100], uni:[6,12], nushi_pond:[140,220], nushi_pier:[300,480], nushi_lake:[200,320]};
const NUSHI = {
  pond:{id:'nushi_pond', bait:'dough', hint:'雨の朝・練りエサ', ok:() => wxOn('rain') && hmNow() >= 300 && hmNow() < 660},
  pier:{id:'nushi_pier', bait:'phantom', hint:'嵐の夜・幻の疑似餌', ok:() => wxOn('storm') && (hmNow() >= 1140 || hmNow() < 300)},
  lake:{id:'nushi_lake', bait:'glow', hint:'B21より深い地底湖・光る虫', ok:() => scene === 'mine' && FL && FL.f >= 21},
};
const LOCN = {pond:'宵闇亭の生簀', pier:'港の桟橋', lake:'地底湖'};
const hmNow = () => Math.floor(S.t % 1440);
const isNight = () => hmNow() >= 1140 || hmNow() < 300;
function tkIcon(id, px) { const t = TKI[id], sc = px / 16; return `<div class="ic" style="width:${px}px;height:${px}px;background-image:url(${URL_.tackle});background-size:${128 * sc}px ${px}px;background-position:-${t.i * px}px 0"></div>`; }
const tkHave = id => (S.tackle || {})[id] || 0;
function fishList(loc) { return loc === 'lake' ? LAKE.map(id => ING[INGI[id]]) : loc === 'pond' ? POND : PIER; }
// v0.54：図鑑に釣れる条件（場所・珍しさ・旬・合うエサ・霧と夜）
function fishCond(g) {
  if (g.src[0] === 'nushi') return 'ヒント：' + NUSHI[g.src[1]].hint + '　幻の疑似餌で掛かりやすい';
  const loc = {pond:'農場の生簀', pier:'桟橋', lake:'地底湖（迷宮）'}[g.src[0]] || '釣り', w = g.src[1], rare = typeof w === 'number' ? (w <= 3 ? '幻' : w <= 8 ? '珍しい' : w <= 15 ? 'やや珍しい' : 'よく釣れる') : '';
  const tk = TACKLE.filter(t => t.fav[g.id]).sort((a, b) => b.fav[g.id] - a.fav[g.id]).map(t => t.n + '×' + t.fav[g.id]);
  const st = SEASON_OF[g.id] && unl('season') ? '旬：' + SEASON_OF[g.id].map(x => SEASONS[x].n).join('・') + (inSeason(g.id) ? '（今！）' : '') + '（旬は1.8倍）' : '';
  return [loc + (rare ? '・' + rare : ''), tk.length ? '合うエサ：' + tk.join('・') : '', st, typeof w === 'number' && w <= 10 ? '霧・夜・良い竿・生簀の強化で出やすい' : '', RARE_FISH.has(g.id) ? '最上級の竿か、光る虫・深海用ジグが必要' : ''].filter(Boolean).join('<br>');
}
function fishPool(f) {
  const tk = TKI[S.tkSel], fog = (evOn('fog') ? 3 : 1) * (wxOn('fog') ? 2 : 1) * (isNight() ? 1.3 : 1), rare = f.rod.rare;
  return fishList(f.loc).filter(g => !RARE_FISH.has(g.id) || f.rod.id === 'rod4' || (tk && (tk.id === 'glow' || tk.id === 'jig')))
    .map(g => ({g, w: g.src[1] * (g.src[1] <= 10 ? (1 + (f.loc === 'pond' ? S.fac.pond * .6 : 0) + rare * .7) * fog : 1) * ((tk && tk.fav[g.id]) || 1) * (tk && tk.nushi ? .35 : 1) * (inSeason(g.id) ? 1.8 : 1)}));
}
const shLen = g => g.src[0] === 'nushi' ? 46 : Math.max(6, Math.min(28, 4 + Math.sqrt(FSZ[g.id] ? FSZ[g.id][1] : 30) * 1.5));
function newShadow(f, g, nushi) {
  return {g, nushi, x:rnd(22, 122), y:rnd(40, 170), a:rnd(0, 6.28), sp:rnd(3, 7) * (nushi ? .6 : 1), len:shLen(g), turn:rnd(1, 3)};
}
function fillShadows(f) {
  const tk = TKI[S.tkSel], n = (tk ? 4 : 3) - f.sh.length;
  for (let i = 0; i < n; i++) f.sh.push(newShadow(f, wpick(fishPool(f)).g, false));
  const nu = NUSHI[f.loc];
  if (nu.ok() && !f.sh.some(s => s.nushi) && tk && (tk.id === nu.bait || tk.nushi) && Math.random() < (tk.nushi ? .6 : .35) * (S.gear && gearAccOn('neck_pearl') ? 1.4 : 1) * (mrDay('fish') ? 1.4 : 1)) { f.sh.push(newShadow(f, ING[INGI[nu.id]], true)); tut('nushi'); }
}
let fishSt = null;
function openFish(loc) {
  if (!unl('fishing')) return gateMsg('fishing');
  const h = heldItem(); let inst = h && h.t === 'tool' && toolOf(h).kind === 'rod' ? toolInst(h.uid) : bestInst('rod');
  if (!inst) return toast('釣り竿がない。外の<b>市場の「道具」</b>で竹の釣り竿（150G）が買える。');
  const hi = S.bag.findIndex(x => x && x.k === 't' && x.uid === inst.uid); if (hi >= 0 && hi < 8) { S.sel = hi; renderHot(); }
  if (!S.tackle) S.tackle = {}; if (S.tkSel && !tkHave(S.tkSel)) S.tkSel = '';
  fishSt = {rod:TOOLI[inst.id], inst, loc, ph:'aim', pw:0, pd:1, sh:[], pt:[], t:0, fl:null, combo:0};
  fillShadows(fishSt);
  player.path = []; player.target = player.mining = null;
  $('fishv').classList.add('show'); $('root').classList.add('fishing'); fishTop(); fishPhase('aim'); tut('fish');
}
function closeFish() { fishSt = null; $('fishv').classList.remove('show'); $('root').classList.remove('fishing'); if (modalOpen) closeModal(); $('fcut').innerHTML = ''; dirty = true; renderHot(); }
function fishTop() {
  const f = fishSt, tk = TKI[S.tkSel], w = wx(), hm = hmNow();
  $('fbar').innerHTML = `<div class="fl"><b>${LOCN[f.loc]}</b><span>${w.i}${w.n}　${String(Math.floor(hm / 60)).padStart(2, '0')}:${String(hm % 60).padStart(2, '0')}${isNight() ? ' 夜' : ''}　${f.rod.name} ${f.inst.dur}</span></div>
    <div class="ftk" id="ftk">${tk ? tkIcon(tk.id, U * 8) : '<div class="ic" style="width:' + U * 8 + 'px"></div>'}<div><span>エサ／ルアー ▼</span><b>${tk ? tk.n + (tk.bait ? ' ×' + tkHave(tk.id) : '（残り' + tkHave(tk.id) + '回）') : 'なし'}</b></div></div><div class="fx" id="fbag">🎒</div><div class="fx" id="fxx">×</div>`;
  $('fbag').onpointerdown = e => { e.stopPropagation(); if (f.ph === 'aim' || f.ph === 'caught' || f.ph === 'miss') { $('fcut').innerHTML = ''; openInv(); } else toast('釣りの最中はカバンを開けない'); };
  $('ftk').onpointerdown = e => { e.stopPropagation(); if (f.ph === 'aim') fishPickTackle(); };
  $('fxx').onpointerdown = e => { e.stopPropagation(); closeFish(); };
}
function fishPickTackle() {
  const own = TACKLE.filter(t => tkHave(t.id));
  $('fcut').innerHTML = `<div class="fpick"><div class="h">エサ／ルアーを選ぶ</div><div class="row" data-tk=""><div class="t"><b>なし</b><span>アタリが遅く、影も少ない</span></div></div>${own.map(t => `<div class="row ${S.tkSel === t.id ? 'sel' : ''}" data-tk="${t.id}">${tkIcon(t.id, U * 10)}<div class="t"><b>${t.n}　${t.bait ? '×' + tkHave(t.id) : '残り' + tkHave(t.id) + '回'}</b><span>狙い：${t.desc}</span></div></div>`).join('')}${own.length ? '' : '<div class="p">エサやルアーは外の市場の「道具」で買える。</div>'}</div>`;
  $('fcut').querySelectorAll('[data-tk]').forEach(el => el.onpointerdown = e => { e.stopPropagation(); S.tkSel = el.dataset.tk; $('fcut').innerHTML = ''; fishSt.sh = []; fillShadows(fishSt); fishTop(); sfx('tick'); });
}
const FMSG = {
  aim:['光の線が影に重なったら、その影をタップ', '線の高さ＝飛距離。遠いほど大物。影に落とすとその魚が寄ってくる'],
  wait:['浮きが沈んだ瞬間にタップ', 'ちょんちょん（前アタリ）で合わせると逃げる。何もない時のタップで仕掛けを戻す'],
  reel:['動く針が緑に来たらタップ', '金色＝ぴったり（2回分進む）／2回外すと逃げられる'],
  tension:['押す＝巻く　離す＝緩める', '張りが赤まで行くと糸が切れる。暴れている時は緩めて'],
};
function fishPhase(ph, extra) {
  const f = fishSt; f.ph = ph; f.t = 0;
  const m = FMSG[ph]; $('fmsg').innerHTML = m ? `<b>${m[0]}</b><span>${m[1]}</span>` : '';
  let h = '';
  if (ph === 'aim') h = `<div class="fgauge"><i id="fgm"></i></div><div class="fglab">飛距離</div>`;
  if (ph === 'reel') h = `<div class="freel"><div class="frl"><span>引き寄せ <b id="frc">0</b> / ${f.need}</span><span id="frd"></span></div><div class="fbar2"><div class="fz" id="fz"></div><div class="fsw" id="fsw"></div><div class="fm" id="fmk"></div></div></div>`;
  if (ph === 'tension') h = `<div class="freel"><div class="frl"><span>糸の張り</span><span id="frun" style="color:#ff8a6a"></span></div><div class="fbar2 ten"><i id="ftn"></i></div><div class="frl"><span>残り距離</span></div><div class="fdist"><i id="fds"></i></div></div><div class="fname">— ${ING[INGI[f.fish.g.id]].name} —</div>`;
  if (ph === 'miss') { h = `<div class="fbig">${extra}</div>`; $('fmsg').innerHTML = '<b>タップでもう一度</b><span></span>'; }
  $('fhud').innerHTML = h;
  if (ph === 'reel') fishZone();
}
function fishZone() { const f = fishSt; f.zw = Math.min(.5, .2 + f.rod.zone + (f.loc === 'pond' ? S.fac.pond * .03 : 0) - f.fish.g.value / 1500); f.z0 = rnd(.05, .95 - f.zw); const z = $('fz'), s = $('fsw'); if (z) { z.style.left = f.z0 * 100 + '%'; z.style.width = f.zw * 100 + '%'; s.style.left = (f.z0 + f.zw * .38) * 100 + '%'; s.style.width = f.zw * 24 + '%'; } }
const castY = p => 186 - p * 150;
const ROD_TIP = [84, 180];
function fishDown(x, y) {
  const f = fishSt; if (!f) return;
  if (f.ph === 'aim') {
    if (y < 26 || y > 192) return;
    f.lx = Math.max(16, Math.min(128, x)); f.ly = castY(f.pw); f.far = f.pw;
    useTool(f.inst); if (!toolInst(f.inst.uid)) { closeFish(); return; }
    const tk = TKI[S.tkSel]; if (tk && !tk.bait) { S.tackle[tk.id]--; if (S.tackle[tk.id] <= 0) { toast(`${tk.n}がすり減ってなくなった。`); S.tkSel = ''; } }
    f.fl = {x:ROD_TIP[0], y:ROD_TIP[1], sunk:0}; f.fly = 0; fishPhase('fly'); sfx('pop'); fishTop(); return;
  }
  if (f.ph === 'wait') {
    if (f.bite) { f.combo++; startReel(); return; }
    if (f.nib > 0) { fishMiss('早すぎた！ 魚が逃げた'); return; }
    f.fl = null; fishPhase('aim'); return;
  }
  if (f.ph === 'reel') {
    const c = f.z0 + f.zw / 2, inZ = f.pos >= f.z0 && f.pos <= f.z0 + f.zw, sweet = Math.abs(f.pos - c) < f.zw * .12;
    if (inZ) { f.cnt += sweet ? 2 : 1; if (sweet) f.sweet++; splash(f.fl.x, f.fl.y, sweet ? 10 : 6); sfx(sweet ? 'coin' : 'tick'); $('frd').textContent = sweet ? 'ぴったり！' : 'よし！'; }
    else { f.miss++; f.cnt = Math.max(0, f.cnt - 1); $('frd').textContent = 'はずれ…'; sfx('break'); if (f.miss >= 2) { fishMiss('逃げられた……'); return; } }
    $('frc').textContent = Math.min(f.need, f.cnt);
    if (f.cnt >= f.need) fishCatch(); else fishZone();
    return;
  }
  if (f.ph === 'tension') { f.hold = true; return; }
  if (f.ph === 'miss' || f.ph === 'caught') { if (f.t < .35) return; $('fcut').innerHTML = ''; f.fl = null; fishTop(); fillShadows(f); fishPhase('aim'); }
}
function fishUp() { if (fishSt) fishSt.hold = false; }
function startReel() {
  const f = fishSt, g = f.fish.g; sfx('pop'); splash(f.fl.x, f.fl.y, 8);
  if (f.fish.nushi) { f.ten = .3; f.dist = 1; f.run = 0; f.runT = rnd(1.5, 3); fishPhase('tension'); return; }
  const fr = f.fish.fr; f.need = Math.min(4, 2 + (g.value >= 30 ? 1 : 0) + (g.value >= 60 ? 1 : 0) + (fr > .8 ? 1 : 0)); f.cnt = 0; f.miss = 0; f.sweet = 0;
  f.pos = 0; f.dir = 1; f.speed = Math.min(2.4, .8 + g.value / 60 + fr * .4) * (f.loc === 'pond' ? .9 : 1);
  fishPhase('reel');
}
function fishMiss(msg) { const f = fishSt; f.combo = 0; if (f.fish && f.fish.sh) { f.fish.sh.flee = 1; } f.fish = null; f.bite = false; f.fl = null; fishPhase('miss', msg); }
function splash(x, y, n) { for (let i = 0; i < n; i++) fishSt.pt.push({x, y, vx:rnd(-18, 18), vy:rnd(-30, -8), l:rnd(.3, .7)}); }
function fishCatch() {
  const f = fishSt, g = f.fish.g, sz = FSZ[g.id] || [10, 40], tk = TKI[S.tkSel];
  if (f.fish.sh) f.sh = f.sh.filter(s => s !== f.fish.sh);
  let r = Math.pow(Math.random(), 1.5) + f.far * .2 + (f.sweet || 0) * .06 + ((tk && tk.size) || 0) + Math.min(.15, f.combo * .02);
  r = Math.min(1, r); const cm = Math.round((sz[0] + (sz[1] - sz[0]) * r) * 10) / 10, star = r < .4 ? 1 : r < .75 ? 2 : 3;
  const nushi = g.src[0] === 'nushi', gold = !nushi && Math.random() < ((star === 3 ? .3 : .04) + (f.sweet || 0) * .03) * luckMul();
  const isNew = !S.known.i[g.id]; const cnt = evOn('fishing') && !nushi ? 2 : 1;
  withQ(star, () => giveBag('i', g.id, gold, cnt)); if (scene === 'mine') tripAdd(g.id, cnt); S.stat.fished++; tmDrop(.015, '釣り上げた'); if (nushi) legRoll(.25, 'kinrin', 'ヌシの群れに、黄金に光る一匹がまじっていた。');
  if (!S.fishRec) S.fishRec = {}; const rec = S.fishRec[g.id] || {max:0, st:0}, prev = rec.max;
  let reward = 0, badge = '';
  if (cm > prev) { rec.max = cm; if (prev) { reward = Math.round(g.value * 2 + cm); badge = '★ 自己ベスト更新！'; } else badge = '初めて釣った！'; }
  if (!(rec.st & (1 << (star - 1)))) { rec.st |= 1 << (star - 1); if (prev) reward += g.value; }
  if (nushi && !prev) reward += g.value * 2;
  S.fishRec[g.id] = rec; S.gold += reward; dirty = true;
  sfx('ok'); splash(72, 196, 14);
  $('fhud').innerHTML = ''; $('fmsg').innerHTML = '<b>タップで続ける</b><span>釣った魚は持ち物（いっぱいなら倉庫）へ</span>';
  $('fcut').innerHTML = `<div class="fcatch ${nushi ? 'nu' : ''}"><div class="rays"></div><div class="fcn">${gold ? '金色の' : ''}${g.name}</div>${icHTML(g.icon, U * 52, gold ? 'gold' : 'atlas')}
    <div class="fcm">${cm.toFixed(1)} cm</div><div class="fst">${'★'.repeat(star)}${'☆'.repeat(3 - star)}　${['小', '中', '大'][star - 1]}サイズ</div>
    ${badge ? `<div class="fbadge">${badge}</div>` : ''}${isNew ? '<div class="fsub">図鑑に登録！</div>' : ''}
    <div class="fsub">${prev ? `前回の最大 ${prev.toFixed(1)}cm` : ''}${reward ? `　報酬 +${fmt(reward)}G` : ''}${star === 3 && !nushi ? '<br>大物は金色になりやすい' : ''}${cnt > 1 ? '<br>釣り大会：2匹！' : ''}${f.combo > 1 ? `<br>${f.combo}連続！ 大きいのが掛かりやすくなっている` : ''}</div></div>`;
  f.fish = null; f.fl = null; fishPhase('caught');
}
function fishUpdate(dt) {
  const f = fishSt; f.t += dt;
  // shadows wander
  for (const s of f.sh) {
    if (s.flee) { s.x += Math.cos(s.a) * 40 * dt; s.y += Math.sin(s.a) * 40 * dt; continue; }
    if (f.fish && f.fish.sh === s && f.fl) { const dx = f.fl.x - s.x, dy = f.fl.y - s.y, d = Math.hypot(dx, dy); s.a = Math.atan2(dy, dx); if (d > s.len * .5) { s.x += dx / d * 10 * dt; s.y += dy / d * 10 * dt; } continue; }
    s.turn -= dt; if (s.turn < 0) { s.turn = rnd(1.5, 4); s.a += rnd(-1.5, 1.5); }
    s.x += Math.cos(s.a) * s.sp * dt; s.y += Math.sin(s.a) * s.sp * dt;
    if (s.x < 20 || s.x > 124 || s.y < 36 || s.y > 176) { s.a = Math.atan2(106 - s.y, 72 - s.x) + rnd(-.6, .6); s.x = Math.max(18, Math.min(126, s.x)); s.y = Math.max(34, Math.min(178, s.y)); }
  }
  f.sh = f.sh.filter(s => !s.flee || (s.x > -40 && s.x < 184 && s.y > -40 && s.y < 300));
  f.pt.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.l -= dt; }); f.pt = f.pt.filter(p => p.l > 0);
  if (f.ph === 'aim') { f.pw += f.pd * dt * .75; if (f.pw > 1) { f.pw = 1; f.pd = -1; } if (f.pw < 0) { f.pw = 0; f.pd = 1; } const m = $('fgm'); if (m) m.style.bottom = f.pw * 100 + '%'; if (f.t > 3 && f.sh.length < 3) fillShadows(f); }
  if (f.ph === 'fly') {
    f.fly += dt / .5; const k = Math.min(1, f.fly);
    f.fl.x = ROD_TIP[0] + (f.lx - ROD_TIP[0]) * k; f.fl.y = ROD_TIP[1] + (f.ly - ROD_TIP[1]) * k - Math.sin(Math.PI * k) * 26;
    if (k >= 1) {
      splash(f.lx, f.ly, 6);
      const near = f.sh.filter(s => !s.flee).map(s => ({s, d:Math.hypot(s.x - f.lx, s.y - f.ly)})).filter(o => o.d < Math.max(14, o.s.len * .6)).sort((a, b) => a.d - b.d)[0];
      let sh;
      if (near) sh = near.s;
      else { const pool = fishPool(f).map(o => ({...o, w:o.w * (1 + f.far * o.g.value / 40)})); sh = newShadow(f, wpick(pool).g, false); const a = rnd(0, 6.28); sh.x = f.lx + Math.cos(a) * 34; sh.y = Math.min(176, f.ly + Math.sin(a) * 34); f.sh.push(sh); }
      const g = sh.g, sz = FSZ[g.id] || [10, 40];
      f.fish = {g, sh, nushi:sh.nushi, fr:Math.random()};
      const tk = TKI[S.tkSel], slow = tk ? 1 : 1.8;
      f.waitT = (near ? rnd(1.2, 2.6) : rnd(2.5, 5)) * slow * (sh.nushi ? 1.6 : 1) * (S.gear && gearAccOn('ring_fish') ? .7 : 1) * (mrDay('fish') ? .7 : 1); f.nibs = Math.floor(rnd(0, 3)); f.nib = 0; f.bite = false;
      fishPhase('wait');
    }
  }
  if (f.ph === 'wait') {
    f.waitT -= dt;
    if (f.nib > 0) { f.nib -= dt; if (f.nib <= 0) f.fl.sunk = 0; }
    else if (!f.bite && f.nibs > 0 && f.waitT < f.nibs * .9 && f.waitT > .3) { f.nibs--; f.nib = .28; f.fl.sunk = 1; sfx('tick'); }
    if (!f.bite && f.waitT <= 0) { f.bite = true; f.biteT = .62 + f.rod.zone * 2 + (f.loc === 'pond' ? S.fac.pond * .06 : 0); f.fl.sunk = 2; splash(f.fl.x, f.fl.y, 5); sfx('coin'); try { navigator.vibrate && navigator.vibrate(40); } catch (_) {}
      const tk = TKI[S.tkSel]; if (tk && tk.bait) { S.tackle[tk.id]--; if (S.tackle[tk.id] <= 0) { S.tkSel = ''; } fishTop(); } }
    if (f.bite) { f.biteT -= dt; if (f.biteT <= 0) fishMiss('遅かった……エサだけ取られた'); }
  }
  if (f.ph === 'reel') {
    f.pos += f.dir * f.speed * dt; if (f.pos > 1) { f.pos = 1; f.dir = -1; } if (f.pos < 0) { f.pos = 0; f.dir = 1; }
    const m = $('fmk'); if (m) m.style.left = `calc(${f.pos * 100}% - ${U * .7}px)`;
    const k = f.cnt / f.need; if (f.fl) { const tx = f.lx + (72 - f.lx) * k, ty = f.ly + (188 - f.ly) * k; f.fl.x += (tx - f.fl.x) * dt * 3; f.fl.y += (ty - f.fl.y) * dt * 3; if (f.fish.sh) { f.fish.sh.x = f.fl.x; f.fish.sh.y = f.fl.y - 2; } if (Math.random() < dt * 3) splash(f.fl.x + rnd(-4, 4), f.fl.y, 2); }
  }
  if (f.ph === 'tension') {
    f.runT -= dt; if (f.runT <= 0) { if (f.run > 0) { f.run = 0; f.runT = rnd(1.5, 3.5); } else { f.run = 1; f.runT = rnd(.8, 1.6); } }
    if (f.hold) { f.ten += (.32 + f.run * .75) * dt; f.dist -= (f.run ? .02 : .085) * dt; }
    else { f.ten -= .45 * dt; f.dist += (f.run ? .07 : .015) * dt; }
    f.ten = Math.max(0, f.ten);
    const tn = $('ftn'); if (tn) { tn.style.width = Math.min(1, f.ten) * 100 + '%'; tn.style.background = f.ten < .6 ? '#5a9a5a' : f.ten < .85 ? '#dcb446' : '#dc4632'; }
    const ds = $('fds'); if (ds) ds.style.width = Math.max(0, Math.min(1, f.dist)) * 100 + '%';
    const rn = $('frun'); if (rn) rn.textContent = f.run ? '暴れている！' : '';
    const k = 1 - Math.max(0, Math.min(1, f.dist)); if (f.fl) { f.fl.x = f.lx + (72 - f.lx) * k + (f.run ? rnd(-1.5, 1.5) : 0); f.fl.y = f.ly + (184 - f.ly) * k; f.fish.sh.x = f.fl.x; f.fish.sh.y = f.fl.y - 18; f.fish.sh.a = -Math.PI / 2 + (f.run ? Math.sin(f.t * 12) * .4 : 0); if (f.run && Math.random() < dt * 8) splash(f.fl.x + rnd(-10, 10), f.fl.y - rnd(0, 20), 2); }
    if (f.ten >= 1) { const tk = TKI[S.tkSel]; if (tk && !tk.bait) { S.tackle[tk.id] = Math.max(0, S.tackle[tk.id] - 10); if (!S.tackle[tk.id]) S.tkSel = ''; } fishTop(); f.fish.sh.flee = 1; fishMiss('ブツッ……糸が切れた！'); return; }
    if (f.dist >= 1.35) { fishMiss('ヌシは深みへ消えていった……'); return; }
    if (f.dist <= 0) { f.sweet = 2; fishCatch(); }
  }
}
function fishDraw() {
  const f = fishSt, c = fctx; c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(IMG['bg_f' + f.loc], 0, 0);
  // ambient ripples
  c.fillStyle = 'rgba(140,190,200,.12)'; for (let i = 0; i < 6; i++) { const x = (i * 37 + tNow * 6) % 130 + 8, y = 40 + i * 24 + Math.sin(tNow + i) * 2; c.fillRect(Math.round(x), Math.round(y), 5, 1); }
  for (const s of f.sh) {
    c.save(); c.translate(s.x, s.y); c.rotate(s.a); const l = s.len, w = Math.max(2, l * .36), wob = Math.sin(tNow * 6 + s.x) * l * .04;
    c.fillStyle = s.nushi ? 'rgba(2,4,8,.78)' : 'rgba(4,10,14,.5)';
    c.beginPath(); c.moveTo(l / 2, 0); c.lineTo(l / 4, -w / 2); c.lineTo(-l / 4, -w / 2); c.lineTo(-l / 2, wob); c.lineTo(-l / 4, w / 2); c.lineTo(l / 4, w / 2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-l / 2 + 1, wob); c.lineTo(-l / 2 - l * .28, -w * .55 + wob); c.lineTo(-l / 2 - l * .28, w * .55 + wob); c.closePath(); c.fill();
    if (s.nushi) { c.fillStyle = '#6ae0d0'; for (let k = 0; k < 4; k++) c.fillRect(Math.round(-l / 3 + k * l / 5), Math.round(Math.sin(tNow * 2 + k) * w * .3), 1, 1); }
    c.restore();
  }
  if (f.ph === 'aim') { const y = Math.round(castY(f.pw)); c.fillStyle = 'rgba(255,220,140,.55)'; for (let x = 14; x < 130; x += 4) c.fillRect(x, y, 2, 1); }
  // rod
  const bend = f.ph === 'reel' || f.ph === 'tension' ? 4 : 0;
  c.strokeStyle = '#8a6a40'; c.lineWidth = 1; c.beginPath(); c.moveTo(76.5, 208); c.quadraticCurveTo(80, 194, ROD_TIP[0] - bend * .5, ROD_TIP[1] + bend); c.stroke();
  if (f.fl) {
    const fl = f.fl; c.strokeStyle = f.ph === 'tension' && f.ten > .85 ? 'rgba(255,120,100,.8)' : 'rgba(210,210,200,.6)';
    c.beginPath(); c.moveTo(ROD_TIP[0] - bend * .5, ROD_TIP[1] + bend); c.lineTo(fl.x, fl.y); c.stroke();
    if (f.ph !== 'fly') {
      const bob = f.ph === 'wait' && !fl.sunk ? Math.round(Math.sin(tNow * 3)) * .5 : 0, sk = fl.sunk || 0;
      c.strokeStyle = 'rgba(160,210,220,.5)'; c.beginPath(); c.ellipse(fl.x, fl.y + 1, 5 + (sk ? 3 : 0) + Math.sin(tNow * 4), 2 + (sk ? 1 : 0), 0, 0, 6.28); c.stroke();
      if (sk < 2 && f.ph === 'wait') { c.fillStyle = '#e8e0d0'; c.fillRect(Math.round(fl.x) - 1, Math.round(fl.y + bob + sk), 3, 2); c.fillStyle = '#d83a2a'; c.fillRect(Math.round(fl.x) - 1, Math.round(fl.y - 2 + bob + sk), 3, 2); }
    } else { c.fillStyle = '#d83a2a'; c.fillRect(Math.round(fl.x) - 1, Math.round(fl.y) - 1, 2, 2); }
  }
  c.fillStyle = 'rgba(225,240,250,.9)'; for (const p of f.pt) c.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  // bite mark
  const bm = $('fbite');
  if (f.ph === 'wait' && f.bite && f.fl) { bm.style.display = 'block'; bm.style.left = f.fl.x / 144 * 100 + '%'; bm.style.top = (f.fl.y - 6) / 256 * 100 + '%'; } else bm.style.display = 'none';
}
const fcv = $('fcv'), fctx = fcv.getContext('2d'); fctx.imageSmoothingEnabled = false;
function fishXY(e) { const r = fcv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 144, (e.clientY - r.top) / r.height * 256]; }
$('fishv').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (!fishSt || modalOpen) return; const [x, y] = fishXY(e); fishDown(x, y); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => $('fishv').addEventListener(ev, () => fishUp()));

// ====================================================== v0.10: seasons / quality / tutorials / regulars / critic / contest
// ----- seasons
const SEASONS = [{n:'春', i:'🌸'}, {n:'夏', i:'🌻'}, {n:'秋', i:'🍁'}, {n:'冬', i:'❄'}];
const seasonIdx = () => [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3][monthIdx()];
const SEASON_OF = {
  hakusai:[3], komatsuna:[0, 3], shungiku:[3], nira:[0], nagaimo:[2, 3], satoimo:[2], mizuna:[3], edamame:[1],
  strawberry:[0], cabbage:[0, 3], spinach:[0, 3], potato:[0, 2], onion:[0], garlic:[0, 2], leek:[3], daikon:[3], wheat:[3, 0],
  tomato:[1], eggplant:[1], pepper:[1], corn:[1], cucumber:[1], chili:[1], basil:[1],
  pumpkin:[2], sweetpotato:[2], shiitake:[2], rice:[2], soy:[2], carrot:[2, 3], ginger:[2],
  turnip:[3, 0], lotus:[2, 3], burdock:[2, 3], okra:[1], asparagus:[0], broccoli:[3, 2], cauliflower:[3], celery:[0, 2], zucchini:[1], paprika:[1], lettuce:[0, 2], mint:[0, 1], shiso:[1], melon:[1], watermelon:[1], peanut:[2], blueberry:[1], sesame:[2],
  carp:[3], smelt:[3], iwashi:[1], sanma:[2], buri:[3], hirame:[3], katsuo:[0, 2], uni:[1], matsutake:[2], bamboo:[0], oyster:[3], sazae:[1],
  trout:[0], tai:[0], ayu:[1], aji:[1], eel:[1], catfish:[1], octopus:[1], saba:[2], salmon:[2], tuna:[3], squid:[3],
};
const inSeason = id => SEASON_OF[id] && unl('season') ? SEASON_OF[id].includes(seasonIdx()) : null;   // null = all year
const seasonText = id => SEASON_OF[id] && unl('season') ? '旬：' + SEASON_OF[id].map(s => SEASONS[s].n).join('・') + (inSeason(id) ? '（今が旬！）' : '') : '';
function growSeasonMul(id) { const s = inSeason(id); return s === null ? 1 : s ? 1.25 : (S.fac.greenhouse ? .8 : .6); }

// ----- quality ★ (pooled average per ingredient / dish)
let curQ = null;
const qOf = id => (S.qual || {})[id] || 1;
const dqOf = key => (S.dq || {})[key] || 1;
const qMul = key => unl('quality') ? 1 + (dqOf(key) - 1) * .2 : 1;
const qStars = q => { const r = Math.max(1, Math.min(3, Math.round(q))); return '★'.repeat(r) + '☆'.repeat(3 - r); };
function blendQ(id, n, q) {
  if (!S.qual) S.qual = {}; const have = ((S.inv[id] || 0) + bagCount('i', id, false));
  S.qual[id] = Math.round((have > 0 ? ((S.qual[id] || 1) * have + q * n) / (have + n) : q) * 100) / 100;
}
function blendDQ(key, n, q) {
  if (c100()) q = 3; if (!S.dq) S.dq = {}; const have = (S.dish[key] || 0) + (S.dishG[key] || 0) + bagCount('d', key, false) + bagCount('d', key, true);
  S.dq[key] = Math.round((have > 0 ? ((S.dq[key] || 1) * have + q * n) / (have + n) : q) * 100) / 100;
}
const withQ = (q, fn) => { const o = curQ; curQ = Math.max(1, Math.min(3, q)); try { return fn(); } finally { curQ = o; } };
const qHTML = q => unl('quality') ? `<span style="color:#e0b45a">品質 ${qStars(q)}</span>` : '';

// ----- tutorials (popup the first time something is added / unlocked / used)
const TUT = {
  expedition:['遠征', '広場の下の道の「採集の地図」から<b>遠征の地図</b>を開ける。馬車で1日かけて遠くの町へ行く（着くのは次の日の朝10時）。<br>留守のあいだも従業員が店を回す。町では宿屋で眠って何日でも滞在できる。帰りも1日。<br>まずは<b>港町シオカゼ</b>。町の評判を上げると、品やレシピが増え、Lv3で次の町への道が開く。'],
  tea:['茶の里ミドリ', '遠征の地図に<b>茶の里ミドリ</b>が加わった。霧の山あいの茶畑の里。<br>茶と和菓子の材料、川魚の町。毎日の<b>野点の茶会</b>で注文の料理を出すと、大きなお礼と評判がもらえる。'],
  sc_tea:['茶の里ミドリ', '上の屋台4つでミドリの食材が買える。白い枠で<b>自分の屋台</b>（茶や和菓子の材料・蒸し料理が好まれる）。右の東屋は<b>野点の茶会</b>。<br>下の建物：左＝茶屋（レシピ）、真ん中＝問屋（交易所）、右＝宿。右下の馬車で帰れる。'],
  exp_chakai:['野点の茶会', '1日1回、茶会の客が<b>2品×2皿</b>を注文する（あなたの知っているレシピから選ばれる）。そろえて出すと、料理の値打ちの3倍以上のお礼と町の評判+80。'],
  capital:['雪の王都シルヴァ', '遠征の地図に<b>雪の王都シルヴァ</b>が加わった。雪に包まれた王の都。<br>狩りの肉・きのこ・酒の町で、温かい煮込みが好まれる。毎日1皿、<b>王宮への献上</b>ができる。'],
  sc_capital:['雪の王都シルヴァ', '上の屋台4つで王都の食材が買える（Lv3でキャビアやトリュフも）。白い枠で<b>自分の屋台</b>（煮る料理が好まれる）。右の赤い台は<b>王宮への献上</b>。<br>下の建物：左＝王都の食堂、真ん中＝商館（交易所）、右＝宿屋。'],
  exp_royal:['王宮への献上', '1日1皿、料理を王家に献上できる。褒美は<b>料理の値打ち×8</b>（町の評判1Lvごとに＋1、金色の料理は×1.5）と町の評判+100。高い料理ほどお得。'],
  isle:['南の果実島ルルア', '遠征の地図に<b>南の果実島ルルア</b>が加わった。船で渡る南の島（行き帰りは1日）。<br>果物と海の幸の島で、果物の料理が好まれる。<b>島の果樹</b>で毎日ただで果物を摘める。'],
  sc_isle:['南の果実島ルルア', '上の屋台4つで島の食材が買える。白い枠で<b>自分の屋台</b>（果物の料理が好まれる）。右の大きな木は<b>島の果樹</b>（1日1回、果物を摘める）。<br>下の建物：左＝浜の食堂、真ん中＝交易小屋、右＝浜の宿。右下の船で帰れる。'],
  exp_grove:['島の果樹', '1日1回、島の果物（マンゴー・パイナップル・パパイヤ・パッションフルーツ・バナナ・ライム）を3＋評判Lv個摘める。ときどきカカオも。'],
  desert:['砂の町サハラン', '遠征の地図に<b>砂の町サハラン</b>が加わった。シオカゼからでも宵闇亭からでも馬車で1日。<br>香辛料と甘い菓子の町。新しい食材8種とレシピ12品がある。<b>夕方17時からは夜のバザール</b>で、屋台がよく売れる。'],
  sc_desert:['砂の町サハラン', '上の屋台4つでサハランの食材が買える。白い枠の場所で<b>自分の屋台</b>を出せる（香辛料の料理と甘い菓子が好まれる）。<br>下の建物：左＝ドームの食堂（レシピ）、真ん中＝キャラバン宿（交易所。海や森の物を高く買う）、右＝宿屋「砂の月」。右下の馬車で帰れる。'],
  exp_night:['夜のバザール', 'サハランの昼は暑くて人通りが少ない。<b>夕方17時〜深夜2時</b>は夜のバザール。屋台の値段が<b>×1.3</b>、1日に売れる数も<b>1.5倍</b>になる。<br>昼に少し売って、夜にまとめて売るのがおすすめ。'],
  sc_port:['港町シオカゼ', '市場の屋台4つでシオカゼの食材が買える。白い枠の場所で<b>自分の屋台</b>を出して料理を売れる（魚介の料理が好まれる）。<br>下の建物：左＝港の食堂（レシピを教わる）、真ん中＝交易所（宵闇亭の物を高く買う）、右＝宿屋（泊まる）。右下の馬車で帰れる。'],
  exp_stall:['自分の屋台', '持ってきた料理を売る。町ごとに好みがあり、シオカゼは魚介の料理と港の料理を高く買う。1日に売れる数は町の評判で増える。売るほど評判が上がる。'],
  exp_trade:['交易所', '毎日3つの「求む」品を、ふつうの2.5倍（評判Lv3から3倍）で買ってくれる。1品につき1日5個まで。シオカゼにない採集・迷宮・熟成の品が多い。'],
  exp_diner:['港の食堂', 'お金を払うとシオカゼの料理を教わる（Lv1で4品、Lv2で4品、Lv3で4品）。教わるたびに町の評判も少し上がる。'],
  tower:['決闘の塔', '1階ごとに1人と料理決闘。勝つと上の階へ、<b>上限なし</b>。10階ごとに「階の主」、10階ごとに間の色が変わる（石→銅→銀→金→黒曜）。<br>気力は持ち越し、5階ごとに全回復。<b>負けたら1階から</b>。途中で降りてもよい。<br>勝つたびに<b>塔のメダル</b>と賞金。メダルは「塔の交換所」で珍しい食材・塔だけのレシピ・衣装と交換。<br>「塔の厨房」でカードを鍛えられる。'],
  tower_k:['塔の厨房', '同じ料理を5皿捧げるとカードが鍛えられる。品質★が高いほど伸びる。＋1ごとに評価と守り+15%、＋3ごとに辛さ+1。鍛えたカードは普通の料理決闘でも強い。'],
  abyss:['奈落の深層', 'B51から先は、降りるたびに6種類の階のどれかになる。<br>深層＝ふつう／<b>毒霧</b>＝体力がじわじわ減る・霧の実／<b>暗闇</b>＝自分のまわりしか見えない・宝箱／<b>鉱脈</b>＝鉱石が多い／<b>魔物の巣</b>＝魔物が多い・深層獣の肉／<b>地底の庭</b>＝魔物なし・深層の食材。<br>10階ごとに魔物が強くなる（上限なし）。新しい鉱石<b>奈落晶</b>で、鍛冶屋ガルドが剣と防具を鍛え直してくれる。'],
  abyss_forge:['鍛え直し', '奈落晶とお金で、剣（攻撃+12%ずつ）と防具（受けるダメージ÷(1＋0.1×段階)）を上限なく強くできる。深く潜るほど必要になる。'],
  fame:['名声レベル', '売上100Gごとに名声が（0.5＋評判/100）貯まる。<b>上限なし</b>。<br>1Lvごとに料理の価値が上がり（Lv50まで+0.4%ずつ、その先+0.1%ずつ）、5Lvごとに町から贈り物。Lv10・25・50・100で称号。<br>画面上の「名声Lv」をタップすると詳しく見られる。'],
  kiwami:['料理の極み', '同じ料理を作り続けると、熟練度★5の先の<b>「極」</b>に達する（150・400・800・1,500・2,500皿、その先は1,500皿ごと。上限なし）。段階ごとに価値 +5%。<br>図鑑の「極み」タブで進み具合が見られる。極めた料理の数（1・3・5・10・20…品）でごほうび。'],
  cellar:['地下貯蔵庫', '「施設」→「店の拡張」で建てると、厨房の床に<b>床扉</b>ができる。地下の<b>熟成台</b>に食材を寝かせると、約1日で品質★が1つ上がり、★3になってからさらに寝かせると<b>熟成品</b>（もとの約3倍の価値）になる。<br>寝かせられる物：牛肉・ハム・チーズ・ワイン・酒・醤油・酢・味噌・漬物'],
  fac_cellar:['地下貯蔵庫', '厨房の真ん中に床扉ができた。降りると熟成台が並んでいる。'],
  sc_cellar:['地下貯蔵庫', '熟成台をタップして食材を寝かせる。寝かせた物に合わせて、樽・かめ・チーズ棚・肉吊りに変わる。下の細い棒が熟成の進み具合。光ったら完成。<br>熟成品は市場の本『熟成の手帖』のレシピで使える。'],
  cellar_put:['熟成中', '熟成はゲームの時間で進む（眠っている間や放置中も）。途中で取り出すと、その時点の品質★のまま戻る。完成すると知らせが出る。'],
  rival:['白昼亭との売上勝負', '毎週（月〜日曜）、宵闇亭と白昼亭で<b>お題</b>の勝負をする（最初の週は売上。そのあとは魚介の料理の売上・甘い料理・皿数・料理の種類などから毎週変わる）。<br>白昼亭の目標は週の初めに決まる。白昼亭をタップしてお題と目標を見て、<b>お題に合う料理を棚に並べれば勝てる</b>。日曜が終わったときに結果発表。3勝で提携。'],
  ach:['実績と称号', '記録を達成すると、ごほうびのお金と<b>称号</b>がもらえる。<br>一覧は「図鑑」の「実績」タブ。手に入れた称号をタップすると、画面上の店の格のところに、ときどき称号が表示されるようになる。'],
  xfer:['データの引き継ぎ', '「コードを作る」で今のデータを文字のコードにできる。別の端末やブラウザで「コードで読み込む」に貼りつけると、続きから遊べる。<br><b>読み込むと、その端末の今のデータは上書きされる</b>。'],
  manual:['説明書', '下のタブの「説明書」で、解放した機能の細かい説明が読める。どこで何が取れるか、加工器具で何が作れるか、迷宮の層ごとの鉱石や魔物なども一覧で見られる。<br>機能が解放されるたびにページが増える。'],
  myset:['マイセット', 'カバンの画面の下で、持ち物とカバンの並びを3つまで保存できる。<br>「呼び出す」と、今の持ち物（道具以外）を倉庫にしまってから、保存した並びどおりに倉庫から取り出す。<br>たとえば「迷宮用（ツルハシ・剣・料理）」「釣り用（竿・エサ）」「畑用（じょうろ・種）」のように使い分けられる。セット名はタップで変えられる。'],
  bio_map:['採集の地図', '広場の道（下）や採集地の看板から地図をひらき、行き先を選ぶ。遠い場所ほど移動に時間がかかる。<br>進み具合に合わせて、川辺・花畑・湿地・火山・雪原・月光の森が増えていく。<br>「＊」の印は、今日群生がある場所。'],
  bio_swipe:['なぞってまとめ取り', '指で画面をなぞると、線の上の食材をまとめて取れる。タップでも1つずつ取れる。<br>続けて取るとコンボになり、5コンボから1回で取れる数が増える。'],
  bio_combo:['コンボ', '1.3秒以内に次を取るとコンボが続く。5コンボで1回 +1、12コンボで +2。'],
  bio_cluster:['群生', '光っている場所は群生。触れると一度に5〜8個取れる。まれに金色の群生もある。'],
  bio_gim:['ごほうびの仕掛け', '各採集地に1日1回、タップするとまとめて手に入る仕掛けがある（揺らす・掘る・引き上げる など）。やらなくても困らない、おまけの大当たり。'],
  bio_dog:['迷子の犬', '川辺に迷子の犬がいる。肉か魚、料理をあげると喜ぶ（1日1回）。3日続けてあげると、相棒になってくれるかも。'],
  bio_full:['かごの容量', '1回の採集で持てる数には限りがある。地図の画面でお金を払うと、かごを大きくできる（最大200個）。'],
  bio_result:['今日の収穫', '採集地を離れると、その回に取った物がまとめて表示される。採集Lvが上がると、一度に取れる量や珍しい物の出やすさが増える。'],
  sc_b_river:['川辺と滝', '滝つぼから流れる清流。クレソンや川エビ、沢わさびが取れる。仕掛け網は1日1回引き上げられる。'],
  sc_b_flower:['花畑の丘', '風車の見える花畑。食用花やラベンダー、はちみつの巣が取れる。晴れの日は花が多い。'],
  sc_b_marsh:['霧の湿地', '霧の立ちこめる湿地。蓮根やじゅんさい、霧茸が取れる。雨や霧の日はきのこが多い。'],
  sc_b_volcano:['火山のふもと', '温泉の湧く火山のふもと。火山塩や温泉卵、火の実が取れる。'],
  sc_b_snow:['雪の高原', '雪に覆われた高原。雪下にんじんや氷いちご、白樺の樹液が取れる。'],
  sc_b_moon:['月光の森', '夜（20時〜4時）にだけ入れる森。星の実や銀くるみ、幽霊百合が取れる。'],
  lottery:['福引きと宝くじ', '広場（泉の左下）の露店で、福引き（1回500G）と週の宝くじ（1枚500G）が買える。<br>福引きは玉の色で当たりが決まる。金の玉なら8,000Gと限定衣装。宝くじは毎週日曜の夜に当選発表。'],
  dice:['魔族とのサイコロ', '裏営業のあいだ、店内の画面上「🎲サイコロ」で魔族の紳士と丁半勝負。<br>2つのサイコロの合計が偶数なら丁、奇数なら半。当たれば賭け金の倍、外れると没収。1晩10回まで。'],
  auction:['行商人の競り', '毎週1回、行商人の競りがある。ライバル3人と値を付け合い、一番高ければ「2番目の値段＋100G」で買える。<br><b>掲示板か荷馬車の「🔨競り」で、週のいつでも入札を預けられる</b>（お金は預かり、土曜10時に自動で競る。負ければ全額戻る）。画面に<b>勝てる見込み</b>が出る。<br>限定の衣装や伝説の食材が出ることもある。'],
  branch:['となり町の支店', '「施設」タブで支店を出すと、自動で営業して1時間ごとに売上が届く（ゲームを閉じている間も）。<br>お金をかけて広げるほど売上が増える。'],
  trade:['食材の相場', '市場の「相場」タブ。牛肉・ワイン・サフラン・トリュフ・キャビアの値段が毎日上下する。<br>安い日に10個ずつ買って、高い日に売る。グラフは過去7日の値動き。'],
  training:['修行の旅', 'Lv10になった従業員を、お金を払って2日間の修行の旅に出せる（その間は働かない）。<br>帰ってくると奥義を身につけ、ずっと強くなる。'],
  outfit:['衣装', '内装の画面の「衣装」タブで、店主の衣装と従業員の制服を買える。<br>着ると見た目が変わり、少しだけ効果もある。福引きや競りでしか手に入らない衣装もある。'],
  armor:['防具', '鍛冶屋ガルドで、鉱石から防具を作れる。防具があると、迷宮で魔物から受けるダメージが減る。<br>新しい層（B11・B21…）に初めてたどり着くと、最大体力も +15 される。'],
  fac_courtyard:['中庭の席', '農場のいちばん下に中庭の席ができた。客足が増え、晴れた昼は畑の作物を使った料理が高く売れる。'],
  fac_bath:['大浴場', '2階の奥に大浴場ができた。宿の泊まり客が増え、宿泊料と朝食代が上がる。'],
  diary:['宵闇亭の秘密', '先代の店主マルタの日記。ページは迷宮の深い階・釣り・採集・住民との会話などで見つかる。<br>見つけたページは「図鑑」の「日記」で読み返せる。次のページの手がかりも書いてある。'],
  tmap:['宝の地図', '釣り・魔物・採集・隠し部屋で、ときどき<b>宝の地図</b>を拾う（最大5枚）。画面上の「🗺地図」で場所を確かめよう。<br>その場所（採集地や町）に行くと、光る×印の盛り土がある。タップして掘ると宝箱が出る。'],
  secret:['隠し部屋', '迷宮やダンジョンの階に<b>ひび割れた壁</b>があることがある。タップすると崩れて、昔の冒険者の隠し部屋に入れる。<br>大きな宝箱には、お金・宝石・装備・卵・薬・宝の地図が入っている。'],
  moon:['満月の夜', '毎週木曜の19時〜朝5時は満月。広場に<b>月の兎の夜店</b>（宝の地図・卵・エリクサー・伝説の食材など、1つずつ）が出る。<br>迷宮には月光スライム（月の雫を落とす）が現れ、魔物がなつきやすい（2倍）。'],
  stele:['石碑と封印の扉', '5つの町の広場に<b>古い石碑</b>がある。調べると紋を写せる。5つそろえて、地下迷宮のB1にある<b>封印の扉</b>へ行こう。'],
  comp:['冒険の仲間', 'ギルド前の広場に、腕の立つ冒険者が1人ずつ現れる。話しかけると依頼が始まり、こなすと仲間になる（盾役・回復役・弓使い・盗賊の4人）。<br>迷宮・ダンジョンには1人連れて行ける。'],
  comp_heart:['仲間の♥', '好物の料理を1日1回ごちそうすると♥が上がる（好物は大きく上がる）。♥が上がると技が強くなり、仲間の話が聞ける（♥1〜5）。'],
  mranch:['魔物牧場', '図鑑★1以上の魔物は、倒したときにまれに<b>なつく</b>（色違いも）。迷宮やダンジョンの魔物・宝箱から<b>魔物の卵</b>も拾える（孵化小屋で1日）。<br>えさ箱に作物や採集物を入れておくと、毎朝それぞれの魔物が素材を生む。魔物は「手伝い」で店や畑も手伝う（3体まで）。'],
  mr_new:['魔物が仲間になった', '仲間になった魔物は<b>魔物牧場</b>（店の外の道しるべから）にいる。牧場がいっぱいのときは小屋で預かる。牧場は強化で最大24体。'],
  familiar:['使い魔', '牧場の魔物を1体「使い魔」にすると、迷宮・ダンジョンでついてきて一緒に戦う。倒した魔物で経験を積んでLvが上がり、<b>Lv15で上位、Lv30で王</b>に進化する（攻撃・牧場の素材が増える）。'],
  herb:['薬草畑', '苗を植えると、ゲームの時間で育つ（眠っている間も）。1区画で3つ。薬草は調合小屋で薬になる。'],
  alchemy:['調合小屋', '薬草と素材を混ぜて<b>30種類</b>の薬を作れる：回復・気力・攻撃や守りの秘薬・炎や冷気の付与・夜目・毒消し・忍び足・なつかせの香・孵化促進・成長・豊穣・商いの香・釣りの香など。<br>迷宮では画面上の「🧪薬」から使う。余った薬は薬問屋に卸せる。'],
  mbreed:['掛け合わせ', 'Lv5以上の2体を石舞台にのせると掛け合わせの卵ができる（5,000G）。特別な組み合わせからは<b>新しい種類</b>（全8種）が生まれる。色違いも出やすい。'],
  dungeon:['専用ダンジョン', '遠征先の町には、それぞれの<b>専用ダンジョン</b>がある（沈没船・砂の神殿・竹林の祠・氷の古城・火山の洞窟）。全10階で、最奥に<b>ボス</b>が待つ。<br>町だけの魔物と素材、ボスだけの伝説の武器と指輪が手に入る。ボスのごほうびは<b>週に1回</b>全部もらえる（ほかの回は少なめ）。'],
  dg_boss:['ボス戦', 'ボスは大技の前に、<b>赤い範囲</b>で予告する。赤い所から歩いて出れば当たらない。<br>体力が3割を切ると怒り、大技が速く多くなる。ときどき手下も呼ぶ。料理を食べて体力を保とう（画面上の「食べる」）。'],
  dg_reward:['ボスのごほうび', 'ボスを倒すと、賞金・ギルドポイント・ボスの素材・伝説の武器と指輪（確率）。<b>ボスの武器は効果が3つ以上</b>（まれに4つ・5つ）つく。<br>初めて倒すと、そのダンジョンの料理帖（4品）を覚える。ごほうびが全部もらえるのは週に1回。'],
  curse:['呪いの石像', '入る前に呪いの段階（1〜5）を選んで供え物をすると、その回だけ魔物が強く・多くなる。<br>そのかわり、落とし物・宝箱のお金・装備が出る確率が段階ごとに+50%、レア度も上がる。ボスのごほうびも増える。'],
  todo:['やること・お知らせ・移動', '画面上の「📋」に、いまできること（実った作物・たまった素材・報告できる依頼など）が並ぶ。「行く」でその場所へ。<br>消えたお知らせは「お知らせの履歴」で読み返せる。「移動」で店・農場・ギルド・牧場などへワンタップで行ける。<br>食材のアイコンを長押しすると、使うレシピや依頼で必要かどうかもわかる。文字の大きさなどは「施設」タブのいちばん下の設定で変えられる。'],
  museum:['博物館と完全攻略率', '道しるべから<b>博物館</b>へ。4つの展示室（食材・魚・魔物・武器と鉱石）に、集めた物を<b>寄贈</b>すると飾られる。魔物の標本は図鑑★1、伝説・ボスの武器は持っているだけで写しを飾れる（なくならない）。<br>10点ごとに館長からお礼。<br>図鑑の一番上の<b>完全攻略率</b>が25・50・75・100%になるとごほうび。100%で宵闇亭が金色に！'],
  restore:['王国の復興帳', '道しるべから<b>旧市街</b>へ。壊れた建物をタップして、食材・料理・お金を<b>納める</b>と、建物が建て直される。<br>建てるたびに町の絵が変わり、それぞれの小さなよい効果がずっと続く。7つ建てると最後に「王城の門」。'],
  c100:['完全攻略率100%', '宵闇亭が<b>金色</b>に輝き、料理の値打ち+10%。<b>黄金の鍋</b>で作る料理はいつも品質★3。博物館の台座にあなたの黄金像。'],
  ibox:['アイテムBOX', '持ち物は<b>食材BOX・料理BOX・その他BOX</b>に分かれている（その他＝種・道具・薬・卵・鉱石・装備・宝の地図）。<br>上の札で絞り込み、「並び」で並べ替え、🔍で名前検索。アイテムをタップすると下にくわしく出て、もう一度タップでカバンへ。「タップで移動」に切り替えると1回で移す。'],
  caravan:['交易キャラバン', '遠征の地図の「🐫交易キャラバン」から。荷馬車を買って「町A⇔町B」の道を決めると、行き帰りをずっと繰り返す（留守・放置中も）。<br>町ごとに日替わりの相場。<b>おまかせ</b>なら毎回いちばんもうかる荷を、自分で荷を選ぶこともできる。盗賊や嵐もあるので、護衛や荷馬車の強化で備えよう。'],
  legend:['伝説の食材', '12種類の<b>伝説の食材</b>は、奈落の深層・決闘の塔の上・ヌシ・月光の森・畑・鶏小屋・裏営業・5つの町などで、ごくまれに見つかる。<br>手に入れると、その食材を使う<b>究極のレシピ</b>を覚える。'],
  ult:['究極の料理', '究極の料理は、とても高く売れる（値打ち3倍）。迷宮で食べると5分間とても強くなり、王宮への献上は3倍、料理決闘のカードも強い。<br>初めて作ると、品ごとに違う<b>永久の強化</b>がつく。12品すべてで称号「究極の料理人」。'],
  arms:['武器と装備', '武器は<b>9種類×3型</b>（剣＝片手剣・大剣・刀、弓＝短弓・長弓・弩、杖＝短杖・長杖・魔導書…）。型ごとに射程・速さ・当たり方が違う。<br>鍛冶屋ガルドの「武器を作る」、迷宮の魔物と宝箱、町の武器屋（交易所）、ギルドの交換所、昇格試験で手に入る。<br>カバンの画面の「⚔装備」で、武器1・指輪2・首飾り1をつけかえる。'],
  gear:['装備', '拾った装備には<b>レア度</b>（並・良・希少・英雄・伝説）とランダムな効果がつく。<br>カバンの画面の「⚔装備」から、武器・指輪・首飾りをつける。いらない物は売れる。'],
  w_forge:['武器を作る', '鉱石と石炭とお金で、9種類×3型の武器を作れる（銅〜奈落晶の9段階）。上を指で左右に動かして種類を選ぶ。'],
  enchant:['付与', '武器の空き枠（レア度で1〜3）に宝石を2個埋めると効果がつく。ルビー＝炎、サファイア＝冷気、エメラルド＝毒、アメジスト＝吸血、ダイヤ＝会心、月長石＝落とし物、冥鉄＝攻撃、夜晶＝速さ、星喰い鉱＝なぎ払い、奈落晶＝守り。付け替えもできる。'],
  acc:['指輪と首飾り', '指輪は2つ、首飾りは1つつけられる。迷宮だけでなく、釣り・採集・お店・遠征にも効く物がある。'],
  guild:['冒険者ギルド', '店の外の広場の左の道しるべから<b>冒険者ギルド</b>へ行ける。<br>掲示板の依頼（討伐・素材集め・料理の納品・踏破）をこなすと、お金と<b>ギルドポイント</b>がもらえる。ポイントがたまったら受付で<b>昇格試験</b>。ランクが上がるとギルドの建物も大きくなる。<br>図鑑に<b>魔物</b>タブも増えた。'],
  sc_guild:['冒険者ギルド', '左の掲示板＝依頼（毎日3件と週に1件）。右の受付＝ランク・ギルドポイント・昇格試験。<br>下の門から店の外の広場へ戻れる。'],
  g_exam:['昇格試験', 'ギルドポイントがたまると、受付で昇格試験を受けられる。指定の階より深い所に<b>試験官の魔物</b>（赤いオーラ）が現れる。倒すと合格してランクが上がる。'],
  mon_dex:['魔物図鑑', '倒した魔物は図鑑の「魔物」タブに載る。同じ魔物を<b>10・100・1,000体</b>倒すと★がつき、★1つごとに<b>その魔物への攻撃+10%・落とし物の確率+25%</b>。'],
  monster:['魔物料理', '迷宮の魔物を倒すと、ときどき<b>魔物の素材</b>（肝・手羽・核・卵・墨など）を落とす。<br>魔物の素材を使った料理には「魔」の印がつく。深夜の客の大好物。レシピは市場の本『魔物料理帖』で覚えられる。'],
  monster_part:['魔物の素材', '魔物の素材を手に入れた。かまどで料理に使える。<br>深い階の魔物ほど、珍しくて価値の高い素材を落とす。'],
  night:['裏営業', '21時〜深夜2時、店内の画面上の「🌙裏営業」で店の裏の営業を始められる（1晩に1回）。<br>幽霊や魔族の客が、棚と倉庫の料理を食べに来る。<b>魔物料理</b>や夜の食材の料理が大好きで、高めの値段でも買ってくれる。<br>ときどき、お金の代わりに<b>幽霊の涙・月の雫・魂花</b>などを置いていく。'],
  night_open:['深夜の客', '深夜の客は少し透けて見える。棚の料理を食べに来る。<br>1時50分に裏営業は終わり、結果が出る。眠るときも終わる。'],
  town:['町への投資', '店の外の広場（泉の右下）にある看板「町の発展計画」で、お金を出して町を育てる。<br>街灯・花壇・パン屋・酒蔵など。客が増えたり、毎朝食材が届いたり、通りの景色も変わる。'],
  town_board:['町の発展計画', '1つずつ、好きな順番で投資できる。7つ目の「時計塔」は、ほかの6つを建てると建てられる。'],
  m_cal:['暦', '日によって違う出来事が並ぶ。<br>行事・行商人・コンテスト・評論家・宴会など、解放した要素の予定がアイコンで出る。日付をタップすると詳しく見られる。<br>予定に合わせて、仕込みや買い出しの日を決めよう。'],
  start:['宵闇亭へようこそ', 'ここは霧月通りの小さな食堂。<br>①裏の農場で作物を育てる ②かまどで料理する ③棚に並べて売る、が基本の流れ。<br>準備ができたら画面上の「🔔開店する」で開店（10時になると自動で開く）。18時に閉店すると、その日の結果が出る。夜は眠るか、明日の仕込みを。<br>ゲームを閉じるときは右上の「💤放置」を押すと、留守中も従業員が働く。<br>画面上の帯に「次の目標」が出るので、迷ったらそれを見よう。'],
  sc_farm:['裏の農場', '空いた区画をタップすると種を植えられる。<br>持ち物でジョウロを選んで作物をタップ＝水やり（早く育ち、品質も上がる）。<br>生簀では釣りができる。'],
  sc_outside:['霧月通り', '店の外。市場（種・食材・道具・本）、依頼の掲示板、鍛冶屋、住民がいる。<br>下へ進むと森の小道と海岸。時間が経つと採集物が湧く。'],
  sc_mine:['地下迷宮', '岩をツルハシで掘り、鉱石や宝石を集める。魔物は剣で倒す。<br>体力と気力は料理を食べて回復。階段で下へ。5階ごとに昇降機。<br>倒れると、その回に拾った物の半分を失う。'],
  m_cook:['料理', '食材を2〜4つと調理法を選ぶ。レシピどおりなら正式な料理、違えば創作料理になる。<br>「惜しい！」と出たらレシピが近い合図。<br>食材の品質★が高いほど、料理の品質も上がる。'],
  m_shelf:['陳列棚と値付け', '料理を並べて値段を決める。客の表情で高いか安いかがわかる。<br>😊安い・🙂ちょうど・😐高い・😠買わない。記録はノートに残る。'],
  m_market:['霧月通りの市場', '種・食材・道具・本・買取の5つの売り場。<br>市場の食材は品質★1。畑や釣りで手に入れた物のほうが良い料理になる。'],
  m_fac:['施設', 'お金（と一部は鉱石）で店や農場を強化する。<br>新しい施設は、建てた時に使い方が出る。'],
  m_staff:['従業員', '雇うと留守中も仕事をしてくれる（最大8時間分）。<br>料理人は覚えたレシピを作り、店員は自動で棚に並べて売る。'],
  m_orders:['依頼の掲示板', '住民の注文。<b>①書いてある料理を作る</b>（まだ作ったことがない料理は、名前・調理法・材料の数・材料1つがヒント。残りの材料はかまどで試して探す）<br><b>②棚に並べずに「届ける」</b>。作った直後の「できあがり」画面からも届けられる。棚に並べるとお客さんが買ってしまうので注意。<br>作れそうにない依頼は、1日1回「入れ替え」できる。<br>宴会の予約・評論家の記事・料理コンテストもここで見られる。'],
  m_forgehut:['鍛冶小屋', '古井戸の下に、ガルドの鍛冶小屋ができた。<br>小屋をタップすると、いつでも鍛冶（ツルハシ・武器・防具・付与・器）ができる。<br>「施設」タブの「⚒ 鍛冶屋ガルド」からも開ける。'],
  m_cap:['料理人の作る上限', 'レシピ帳の「上限」を押すたびに ∞→3→5→10→20→40 と変わる。<br>倉庫・棚にその料理が上限の数あると、料理人はもう作らない（材料の使いすぎを防ぐ）。'],
  m_res:['通りの住民', '通りの住民は、時間によって顔ぶれが変わる。話しかけると1日1回 親しさが上がり、親しさ3ごとにその人らしい物をくれる。<br>好きな物を持って近づくと「贈る」ができる（説明書「通りの住民」に好きな物の一覧）。'],
  m_tower:['霊峰の修練の塔', '古井戸（地下迷宮の入口）の「🗼霊峰の修練の塔へ」から行ける。全30階＋頂。どの階も敵を全部倒すと階段が出る。10階・20階・頂に<b>階の主</b>。<br><b>鎧</b>（青いゲージ）を着た敵は<b>技でしか鎧を割れない</b>。盾持ちはふつうの攻撃を7割防ぐ。<br>階を制すると<b>修練の証</b>。証は覚醒と、好きな<b>銘の武器</b>との交換に使う。'],
  m_skill:['技', '攻撃を当てる（または攻撃を受ける）と、足元のゲージがたまる。満タンになったら、画面上の<b>「⚔技！」</b>を押そう。<br>技は武器の種類で決まる（剣＝回転斬り、短剣＝連撃、槍＝突進突き、槌・斧＝大地割り、弓＝矢の雨、杖＝魔法陣、包丁＝解体、鎌＝大旋風、鞭＝縛り打ち）。<b>銘の武器</b>は技に追加効果がのる。'],
  m_wgrow:['武器の成長と覚醒', '装備している武器は、魔物を倒すと経験がたまり<b>Lv</b>が上がる（Lvごとに攻撃+2%、Lv20まで）。<br>Lv20の<b>銘・伝説・ボスの武器</b>は、鍛冶屋の工房で<b>覚醒</b>できる（攻撃×1.2・技1.5倍・付与の枠+1、名前に「真・」）。覚醒のあとも、使うほど上限なしで+1%ずつ強くなる。'],
  m_soil:['畑の土と輪作', '畑の区画には<b>土の肥えぐあい</b>がある（区画の色：黒っぽい＝肥えた土、白っぽい＝やせた土、ひび＝カラカラ）。<br>同じ仲間の作物（葉もの・根もの・実もの・豆・穀物・いも・香草・きのこ）を続けて育てると<b>連作</b>で土がやせ、品質も下がる。<b>ちがう仲間</b>を順に育てる（輪作）と品質と量が上がる。<br><b>豆</b>（大豆・枝豆・落花生）は土を肥やす。肥料をまく・たい肥をすき込む・区画を空けて休ませても戻る。'],
  m_hill:['丘の農地', '裏の農場のいちばん下から行ける、奥の丘。下の<b>立て札</b>で土地を買う（1区→2区→3区の順）。<br>1区ごとに<b>畑8区画・果樹4本</b>が増える。畑の扱い（種・水やり・道具・農夫）は裏の農場と同じ。<br>植えた苗木は、木をタップして<b>「抜く」</b>と植え替えられる（苗木代の半分が戻る）。'],
  m_hillsp:['特別な畑と動物', '<b>特別な畑</b>（2区：棚田・茶畑、3区：ぶどう棚・きのこの原木）は一度建てると、種なしで育ち続ける。収穫は2回分までためておけて、農夫がいると自動で収穫。<br><b>動物</b>（1区）：羊＝羊乳、ヤギ＝ヤギ乳、豚＝トリュフやきのこを掘る、アヒル＝卵。小屋を建てると2頭、増築で4頭。えさはいらない。<br>羊乳・ヤギ乳は<b>乳製品台</b>で、茶葉ともち米は<b>石臼</b>で加工できる。'],
  sc_hill:['丘の農地', '下の立て札で土地を買う。草むらの区画は、まだ買っていない土地。'],
  m_tavern:['冒険者の酒場', 'ギルドの建物の中は冒険者の酒場。<br><b>カウンター</b>：冒険者の注文が毎日3件。倒した魔物の素材や、行った町の料理を頼まれることも。届けるとお金とギルドポイント。<br>奥の<b>訓練所</b>（ランクE）・<b>鑑定屋</b>（ランクD）・<b>闘技場</b>（ランクC）は、ギルドランクが上がると開く。'],
  m_train:['訓練所', '武器の種類（剣・短剣・槍…）ごとに熟練度がある。その種類の武器で魔物を倒すと上がり、Lvごとにその種類の攻撃+2%（最大Lv20）。<br>教官に稽古をつけてもらうと、お金で熟練度を上げられる（1日3回）。'],
  m_appraise:['鑑定屋', 'これから迷宮で拾う「希少」以上の武器は<b>未鑑定</b>。未鑑定のあいだはランダムな効果がはたらかない。<br>鑑定屋で鑑定すると効果が分かり、15%で効果が1つ増える。'],
  m_arena:['闘技場', '<b>勝ち抜き</b>：5連戦・10連戦・無限。体力は持ち越し、波の合間に少し回復。倒れても何も失わない。勝った波の数だけ闘技場メダル、週の最高記録でごほうび。<br><b>ボスと再戦</b>：倒したことのあるボスの強化版と戦える（1日1回ずつ）。<br>メダルはカウンター横の交換所で品物に。'],
  m_works:['武器の工房', '鍛冶屋ガルドの「🔨 工房」。<br><b>鍛え上げ</b>：鍛冶屋で作った武器を、次の鉱石の武器へ（効果・付与はそのまま。作り直すより安い）<br><b>合成</b>：同じ武器2本でレア度を1つ上げる（効果と付与の枠も増える）<br><b>分解</b>：使わない武器を鉱石・石炭・宝石に戻す<br><b>ガルドの依頼</b>：週に1回、鉱石を納めると「ガルド銘」の武器（英雄・効果3つ・攻撃+10%）<br>ランダムな効果のついた武器を初めて手に入れると<b>振り直し</b>も使える。'],
  m_brewer:['仕込み師', '加工器具の加工法の「🤖自動」を押すと、仕込み師がその物を自動で仕込む（器具ごとに1つ）。<br>材料は倉庫から使い、足りない市場の材料は1日の予算内で買う。作るリストの材料は使わない。'],
  m_fishmk:['朝の魚市', '市場に「🐟魚市」の札ができた。毎朝6時〜10時だけ開き、日替わりで魚・貝・エビなどが5品並ぶ（ときどき珍しい魚も）。<br>値段は値打ちの1.5倍。狙った魚が釣れない時に。'],
  m_fishcond:['釣れる条件', '魚の図鑑に、釣れる場所・珍しさ・合うエサ（×は掛かりやすさ）・旬が出る。<br>珍しい魚は、霧の日・夜・良い竿・生簀の強化で出やすくなる。'],
  m_plv:['主人公のレベル', '迷宮やダンジョンで魔物を倒す・岩を砕くと経験がたまり、主人公のレベルが上がる。<br>Lvが1上がるごとに、最大体力+5・最大気力+4（最大Lv50）。迷宮の上の帯に今のLvが出る。'],
  m_plate:['初めての味', '迷宮の「食べる」で、まだ食べたことのない料理を食べると、最大体力+1（2品ごとに最大気力も+1）。100品まで。<br>食べる画面で「✨初めて」と出ている料理が対象。'],
  m_scroll:['帰還の巻物', '使うとすぐ地上（ダンジョンなら町）へ戻る。<br>①帰り道のおまけで、その回に拾った物が2割増える<br>②「帰還の印」が残り、次は入口から「その階から再開」を選べる（1回だけ）<br>③持っていれば、倒れそうな時に自動で使われ、何も失わない'],
  m_up:['上の階へ戻る', '降りてきたはしご（画面の上）から、上の階へ戻れる。<br>戻った階は、壊した岩も倒した魔物もそのまま（復活しない）。<br>ツルハシが壊れたときも、はしごを登って地上へ帰れる。'],
  m_wish:['作るリスト', '☆を押したレシピが「作るリスト」に入る。何品でも入れられ、＋−で皿数も決められる。<br>市場では、必要な食材に★がつき、「あと何個」「必要・手持ち」が出る（★の食材は一覧の上に並ぶ）。<br>レシピ帳のいちばん上で、そろった材料と足りない食材の合計が見られる。<br>かまどのレシピ帳でも☆を押せて、☆のレシピは上に並ぶ。<br><b>作るリストの材料は、料理人が倉庫から使わずに取っておく。</b>自分で作るたびに皿数が減り、0になるとリストから外れる。'],
  m_rec:['レシピ帳', '覚えたレシピと、作ったことのあるレシピ。<br>本を買うか、住民や常連客と仲良くなると増える。'],
  m_dex:['図鑑', '料理・食材・加工品・鉱石・釣り・常連客の記録。<br>未発見のものはシルエットで表示される。'],
  m_forge:['鍛冶屋ガルド', 'ツルハシと剣を、鉱石を使って1段階上に作り直せる。<br>宝石で器も作れる（棚に置くと料理の価値が上がる）。'],
  m_workshop:['加工工房', '燻製・干物・漬物・パン・蒸留などの加工器具を置ける。<br>器具は放っておいても少しずつ作ってくれる。'],
  m_mach:['加工器具', '材料を入れておくと、時間で自動的に加工品ができる（留守中も）。<br>器具を強化すると作れる物が増える。'],
  m_trap:['かご罠', 'エサを入れておくと約4分ごとに獲物がかかる（倉庫へ）。嵐の日は倍。'],
  m_ranch:['牧場', '鶏小屋と牛舎。えさ箱にえさがあれば卵や牛乳ができる。<br>動物をなでると仲良くなり、品質の良い卵や牛乳になる。'],
  m_mineentry:['迷宮の入口', '一度行った昇降機の階から再開できる。<br>料理を持って行こう（食べて体力・気力を回復）。'],
  m_eat:['食事', '料理を食べると体力と気力が回復。<br>味によって一時的な効果がつく（辛い＝攻撃↑など）。'],
  fac_greenhouse:['温室', '魔法の作物（マンドラゴラ・夜光ナス・月光キノコ）が育てられる。<br>旬でない作物の成長の遅れも少し和らぐ。'],
  fac_sprinkler:['スプリンクラー', '前のほうの区画に自動で水をやる。'],
  fac_compost:['たい肥箱', '野菜くずからたい肥を作る。畑にまくと成長や品質が上がる。'],
  fac_seedmaker:['種子づくり機', '収穫した作物から種を作れる。'],
  fac_orchard:['果樹園', '苗木を植えると約20分で育ち、その後は何度でも実る。'],
  fac_coop:['鶏小屋', '鶏が卵を産む。えさ箱にえさを入れておこう。'],
  fac_barn:['牛舎', '牛が牛乳を出す。えさ箱にえさを入れておこう。'],
  fac_workshop:['加工工房', '店の外に工房ができた。燻製小屋などの加工器具を置ける。'],
  fac_bee:['養蜂箱', 'はちみつが自動でたまる。'],
  fac_sign:['看板', '客が来る間隔が短くなる。'],
  fac_pond:['生簀の強化', '釣りが簡単になり、珍しい魚が増える。'],
  st_cook:['料理人', '作ったことのあるレシピから、儲かる料理を自動で作る。<br>レシピ帳で作らせたくない料理を外せる。'],
  st_clerk:['店員', '倉庫の料理を自動で棚に並べ、値段も付けて売る。<br>強気・ふつう・お手頃の売り方を選べる。'],
  st_farmer:['農夫', '畑の水やり・収穫・植え直しと、果樹や牧場の世話をする。'],
  st_fisher:['釣り人', '生簀で魚を釣ってくる。'],
  st_miner:['採掘人', '行ったことのある階で鉱石を掘ってくる。'],
  tool_can:['ジョウロ', '持ち物で選んで作物をタップ＝水やり。成長が早くなり、品質も上がる。'],
  tool_hoe:['クワ', '持って空き区画をタップすると、まとめて植えられる。'],
  tool_rod:['釣り竿', '生簀・桟橋・地底湖で使う。市場でエサやルアーを買うと、狙った魚が釣りやすくなる。'],
  tool_sickle:['鎌', '持って作物をタップすると、まとめて収穫できる。'],
  tool_pick:['ツルハシ', '地下迷宮で岩を掘る。段階が上がると硬い岩も掘れる。'],
  tool_sword:['剣', '地下迷宮で魔物と戦う。隣に来た魔物には自動で反撃する。'],
  fish:['釣り', '①光の線が影に重なったら、その影をタップして投げる（遠いほど大物）<br>②浮きが沈んだ瞬間にタップ（ちょんちょんは我慢）<br>③動く針が緑に来たらタップ。<br>釣った魚はサイズが記録され、最大を更新すると報酬。'],
  nushi:['ヌシの影', '巨大な影はヌシ（伝説の魚）。<br>掛かると「糸の張り」の攻防になる。押す＝巻く、離す＝緩める。暴れている時は緩めよう。'],
  wx_rain:['雨の日', '畑の水やりが不要になる。'],
  wx_fog:['霧の日', '珍しい魚が掛かりやすい。'],
  wx_storm:['嵐の日', '客が減るが、かご罠の獲物が倍になる。港のヌシが現れるという噂も…'],
  event:['月の行事', '毎週金〜日曜は、その月の行事。流行の料理や特別な効果がある。画面上部に表示される。'],
  season:['季節と旬', '1年は春夏秋冬。作物と魚には「旬」がある。<br>旬の作物は早く育ち、品質も上がる。旬でない作物は育ちが遅い（温室で少し和らぐ）。<br>旬は種や食材を長押しすると見られる。'],
  quality:['品質★', '食材には品質★1〜3がある。水やり・たい肥・旬・大きな魚・動物との仲良し度で上がる。<br>品質の高い食材で作った料理は価値が上がる（★3で約1.4倍）。'],
  regular:['常連客', '常連客が来店した！ 好みの味の料理を買うと親しさが上がる。<br>親しくなると話が進み、レシピや特典がもらえる。<br>図鑑の「常連」で確認できる。'],
  critic_soon:['評論家が来る', '今日、料理評論家が来店するらしい。<br>棚で一番価値の高い料理を食べて採点する。品質・値付け・味・器が見られる。'],
  critic:['評論家の記事', '星4以上で記事に載ると、1日のあいだ客が増える。<br>記事は依頼の掲示板で読める。'],
  contest:['料理コンテスト', '毎週木〜日曜は町の料理コンテスト。<br>テーマに合った料理を1品出品し、ライバルと競う。<br>価値・品質・テーマの合い方で採点。上位は賞金と賞品。<br>テーマは週の初め（月曜）から掲示板に出る。'],
  expand:['店の拡張', '「施設」タブの一番上に「店の拡張」がある。条件を満たすと順に解放される。<br>厨房 → 2階の客席 → テラス席・酒場カウンター・宿屋 の順に広がっていく。'],
  fac_kitchen:['厨房の拡張', '料理をたくさん保管できるようになり、料理人がときどき2品同時に作る。'],
  fac_upstairs:['2階の客席', '店内の左下に階段ができた。2階は客席・テラス・酒場・客室に広げられる。<br>客足が増え、追加注文もしてくれる。'],
  sc_upstairs:['宵闇亭の2階', '上が客室の廊下、左が客席、右がテラス、下が酒場カウンター。<br>鍵のかかった場所は「施設」の「店の拡張」で開いていく。'],
  fac_terrace:['テラス席', '夜景の見えるテラス。旬の食材を使った料理が高く売れる。<br>雨や嵐でない日は客も増える。'],
  fac_bar:['酒場カウンター', '夜（18時〜翌2時）、倉庫のワインや酒を自動で売る。<br>ワインは魔導蒸留器（工房）、酒は醸造樽で作れる。'],
  fac_inn:['宿屋', '毎晩19時に旅人が泊まりに来て宿泊料を払う。<br>翌朝7時、倉庫の料理から朝食を出す（ご飯もの・蒸し料理・卵やパンが好まれる）。<br>朝食を用意しておかないと評判が下がる。'],
  inn_first:['初めての泊まり客', '旅人が泊まりに来た！ 明日の朝7時までに、倉庫に朝食向きの料理を用意しておこう。<br>泊まり客はときどき、まだ知らないレシピの噂を話してくれる。'],
  sc_wilds:['霧の森と月光の浜', '森と浜の採集地。なぞってまとめて食材を取ろう。<br>森の祠（1日1回の祈り）、潮だまり、難破船、かご罠もある。実のなる大木と砂の盛り上がりは、1日1回のごほうびの仕掛け。'],
  merchant:['仕入れ商人', '毎週火曜と土曜の10時〜22時、広場に行商人ドルンの荷馬車が来る。<br>サフランやトリュフなど市場にない食材、肥料、本などを売っている。<br>買うほど、なじみ割引が増える。'],
  stall:['出張販売', 'お客の吹き出しと同じ料理を、下の料理からタップして渡す。<br>「甘いもの！」のような注文は、条件に合う料理ならどれでもOK。<br>続けて正しく渡すとコンボで値段が上がる。間違えるとコンボが切れる。'],
  staff_lv:['従業員のレベル', '従業員は働くほどレベルが上がり、作業が速くなる。<br>Lv5とLv10で、ひとりずつ得意技を選べる（従業員タブ）。<br>まかないを出すと、30分間みんなの作業が速くなる。'],
  airec:['オリジナルレシピ（試作台）', 'かまどの「🧪試作台」で、料理長と一緒に新しい料理を作る。<br>①材料（6つまで）と調理法、<b>仕上げ</b>（味付け・盛り付け・ジャンル）を選んで「味見する」→ 料理長のひとことと完成度がわかる（最大5回・食材は減らない）。<br>②上の欄に<b>「ひとことで注文」</b>（例：寒い夜に温まる辛いスープ）を書いて「頼む」と、料理長が手元の食材で組み立ててくれる。<b>「💡材料を聞く」</b>で足すと良い食材が光る。<br>③「これで完成にする」→ 名前と説明をつけてオリジナルレシピ図鑑に登録。1日3品まで。'],
  duel:['料理決闘', '覚えたレシピがカードになる。毎ターン「火」3つ分のカードを出して戦う。<br>旨み＝評価（相手の気力を削る）、甘み＝守り、辛み＝辛さ（毎ターン追加の評価）、酸味＝カードを引く、苦み＝相手を弱気にする。調理法でも効果が少し変わる。<br>相手の「次の手」を見て、攻めるか守るか決めよう。5人勝ち抜くと完全制覇。'],
  breed:['品種改良', '農場の道具小屋の「交配台」で種を2つずつ掛け合わせる。<br>同じ種どうし＝品種改良（Lv1：成長+15%、Lv2：品質+0.4、Lv3：収穫+1）。<br>違う種どうし＝相性が良ければ新しい作物が生まれる。たまに突然変異も。失敗するとヒントがもらえる。'],
  decor:['内装', '床・テーブル・照明・飾り（3か所）を買って置き換えられる。<br>テーマ（魔女・騎士・貴族・東方）ごとに来やすい客や高く売れる料理が変わる。<br>6か所を同じテーマで揃えると「テーマ完成」で客足+10%。'],
  hours:['営業時間と夜', '朝6時から、画面上の「🔔開店する」で店を開ける（開けないと10時に自動で開店。店員がいれば9時）。18時に閉店し、その日の結果が出る。<br>夜は外が危ないので、厨房の奥のベッドで眠る（朝までとばす）、地下迷宮に潜る、明日の仕込みをする、など。<br>2時を過ぎても起きていると倒れてしまう。夜の森と浜には行けない。'],
  sleep:['眠る', 'ベッドで眠ると朝6時まで時間がとぶ。眠っている間も、料理人の仕込み・加工・酒場・宿屋は動く。'],
  rank:['店の格', '評判と売った数で店の格が上がる。<br>格が上がると、新しい客層（お金持ちの客など）や常連客が来るようになる。'],
  moon:['月光エキス', '持って「使う」と30分間、金色の食材が出る確率が3倍になる。'],
};
const NEW_TUT = ['season', 'quality', 'regular', 'critic', 'critic_soon', 'contest', 'fish', 'nushi', 'm_dex', 'expand', 'fac_kitchen', 'fac_upstairs', 'sc_upstairs', 'fac_terrace', 'fac_bar', 'fac_inn', 'inn_first', 'sc_wilds', 'merchant', 'stall', 'staff_lv', 'decor', 'breed', 'duel', 'airec', 'hours', 'sleep'];
const tutQ = []; let tutOpen = false;
function tut(k) {
  if (!S.tut) S.tut = {}; if (S.tut[k] || !TUT[k]) return;
  S.tut[k] = 1; dirty = true; tutQ.push({t:'tut', k}); showTut();
}
function showTut() {
  if (tutOpen || !tutQ.length || $('intro')) return;
  const q = tutQ.shift(); tutOpen = true;
  let h;
  if (q.t === 'tut') { const [ti, tx] = TUT[q.k]; h = `<div class="tth">📖 ${ti}</div><div class="ttx">${tx}</div>`; }
  else h = q.html;
  $('tut').innerHTML = `<div class="tcard">${h}<div class="btn big" id="tok">わかった</div></div>`; $('tut').classList.add('show');
  $('tok').onclick = e => { e.stopPropagation(); $('tut').classList.remove('show'); tutOpen = false; if (q.cb) q.cb(); setTimeout(showTut, 120); };
}
function popStory(html, cb) { tutQ.push({t:'story', html, cb}); showTut(); }

// ----- regulars (常連客)
const REGS = [
  {id:'noa', k:'hood', name:'フードの少年ノア', pref:0, fav:'パンケーキ', rank:0, perk:'客足 +5%', rec:'ノアのベリーパンケーキ', gift:['honey', 3, true],
   story:['「……この店、いい匂いがする」<br>フードを目深にかぶった少年が、小銭を数えている。<br>「甘いの、好きなんだ」', '「母さんがよく作ってくれた料理があるんだ。作り方、教えてあげる」', '「本当はね、パンケーキが一番好き」<br>「これ、森で見つけたんだけど、あげる」', '「ぼく、店の前で呼び込みしてあげる！」', '「大きくなったら料理人になる。最初のレシピは、宵闇亭にあげるって決めてたんだ！」']},
  {id:'bald', k:'knight', name:'老騎士バルド', pref:4, fav:'ステーキ', rank:1, perk:'迷宮で最大体力 +20', rec:'バルドの騎士ステーキ', gift:['ruby', 2, false],
   story:['「若いの、肉はあるか」<br>古びた鎧の老騎士が、静かに腰を下ろした。<br>「旨みの強い料理が、体に沁みる」', '「かつての戦友が遺した野営料理だ。持っていけ」', '「……実はな、ステーキには目がない」<br>「迷宮で拾った物だが、わしにはもう要らん」', '「迷宮へ潜るなら、この呼吸を覚えておけ。倒れにくくなる」', '「宵闇亭の灯りに、何度救われたことか。わしの秘伝を受け継いでくれ」']},
  {id:'ryuka', k:'traveler', name:'吟遊詩人リュカ', pref:1, fav:'カレーライス', rank:1, perk:'流行の料理の価値 +10%', rec:'リュカの旅鍋', gift:['gold_', 800],
   story:['「やあ店主さん！ 歌のお礼に一皿……なんてね」<br>リュートを抱えた旅人が笑う。<br>「辛いのに目がないんだ」', '「南の港町で覚えた料理さ。教えてあげる」', '「カレーライスがあったら、何杯でもいけるよ」<br>「旅先の稼ぎのおすそ分けだ」', '「宵闇亭の歌を作ったよ。広場で歌えば、流行りの料理がもっと売れる」', '「次の旅に出る前に。僕の旅のすべてが詰まった鍋だ」']},
  {id:'cecil', k:'noble', name:'令嬢セシル', pref:2, fav:'いちごのショートケーキ', rank:2, perk:'金色の料理の価値 +10%', rec:'セシルの苺タルト', gift:['diamond', 1, false],
   story:['「……ここが噂の宵闇亭ですのね」<br>上品な令嬢が、扇の陰から店を眺める。<br>「酸味の効いた、さわやかなお味が好みですわ」', '「屋敷の料理長から聞き出しましたの。特別ですわよ」', '「いちごのショートケーキ……あれは反則ですわ」<br>「お礼に、お父様の蔵から」', '「社交界で宵闇亭のことを話しましたの。金色の料理の評判が上がりますわよ」', '「わたくしの考えたお菓子、宵闇亭で出していただけないかしら」']},
];
const REGI = {}; REGS.forEach(r => REGI[r.id] = r);
const HEART = [5, 15, 30, 50, 80];
const SECRET_R = new Set(REGS.map(r => REC.findIndex(x => x.name === r.rec)));
const regOf = id => { if (!S.reg) S.reg = {}; return S.reg[id] || (S.reg[id] = {aff:0, lv:0, vd:-1, vn:0}); };
const perkOn = id => regOf(id).lv >= 4;
function rollRegular() {
  if (!unl('regulars') || Math.random() > .08) return null;
  const day = gday(), ok = REGS.filter(r => rankIdx() >= r.rank && (regOf(r.id).vd !== day || regOf(r.id).vn < 2));
  if (!ok.length) return null; const r = pick(ok), st = regOf(r.id); if (st.vd !== day) { st.vd = day; st.vn = 0; } st.vn++; return r;
}
function regVisit(r, s, re, vis) {
  const st = regOf(r.id), t = dishTaste(s.key), d = dishInfo(s.key);
  let g = re === 'no' ? -1 : 1 + (t[r.pref] >= 3 ? 2 : 0) + (d.name === r.fav ? 3 : 0) + (dqOf(s.key) >= 2.5 ? 1 : 0) + (re === 'cheap' ? 1 : 0);
  st.aff = Math.max(0, st.aff + g); dayTrack().regs.push(r.name);
  if (!S.tut || !S.tut.regular) tut('regular');
  if (vis && scene === 'interior' && g > 0) floatAt(72, 196, '♥ ' + r.name, 'info');
  while (st.lv < 5 && st.aff >= HEART[st.lv]) { st.lv++; regLevel(r, st.lv); }
}
function regLevel(r, lv) {
  let rw = '';
  if (lv === 2) { const un = REC.map((x, i) => i).filter(i => !S.learned[i] && !S.known.r[i] && !SECRET_R.has(i) && !REC[i].ings.some(id => FANTASY.has(id) || RARE_FISH.has(id))); if (un.length) { const ri = pick(un); learnRecipes([ri]); rw = `レシピ『${REC[ri].name}』を教わった！`; } }
  if (lv === 3) { const [id, n, g] = r.gift; if (id === 'gold_') { S.gold += n; rw = `${fmt(n)}G をもらった！`; } else { add(g ? S.invG : S.inv, id, n); S.known.i[id] = true; rw = `${g ? '金色の' : ''}${ingName(id)}×${n} をもらった（倉庫へ）`; } rw += `<br>大好物は「${r.fav}」らしい。`; }
  if (lv === 4) { rw = `特典：${r.perk}`; if (r.id === 'bald') { const M = mineState(); M.hpMax += 20; } }
  if (lv === 5) { const ri = REC.findIndex(x => x.name === r.rec); if (ri >= 0) { S.learned[ri] = true; rw = `特製レシピ『${r.rec}』を受け継いだ！`; } }
  if (lv === 1) rw = `好み：${TLABEL[r.pref]}`;
  if (!S.storyQ) S.storyQ = []; S.storyQ.push({id:r.id, lv, rw}); dirty = true;
}
function flushStories() {
  if (!S.storyQ || !S.storyQ.length || tutOpen || $('intro')) return;
  const q = S.storyQ.shift(), r = REGI[q.id];
  popStory(`<div class="tst">${charHTML(r.k, U * 22)}<div><div class="tth">${r.name}</div><div class="hearts">${'♥'.repeat(q.lv)}${'♡'.repeat(5 - q.lv)}</div></div></div><div class="ttx">${r.story[q.lv - 1]}</div>${q.rw ? `<div class="trw">${q.rw}</div>` : ''}`);
  sfx('ok'); dirty = true;
}
function regDexHTML() {
  return '<div class="p">常連客は好みの味の料理を買うと親しくなる。♥が増えるごとに話が進み、レシピや特典がもらえる。</div>' + REGS.map(r => {
    const st = regOf(r.id), lock = rankIdx() < r.rank && !st.aff;
    if (lock) return `<div class="row" style="opacity:.55">${charHTML(r.k, U * 13)}<div class="t"><b>？？？</b><span>店の格が「${RANKS[r.rank].n}」になると来店する</span></div></div>`;
    const nx = st.lv < 5 ? HEART[st.lv] : null;
    return `<div class="row">${charHTML(r.k, U * 13)}<div class="t"><b>${st.aff || st.lv ? r.name : '？？？'} <span class="hearts" style="display:inline">${'♥'.repeat(st.lv)}${'♡'.repeat(5 - st.lv)}</span></b><span>${st.lv >= 1 ? '好み：' + TLABEL[r.pref] : 'まだ来店していない'}${st.lv >= 3 ? '　大好物：' + r.fav : ''}${st.lv >= 4 ? '<br>特典：' + r.perk : ''}${nx ? `<br>親しさ ${st.aff}/${nx}` : '<br>親しさ 最大'}</span></div>${st.lv ? `<div class="btn" data-story="${r.id}">話</div>` : ''}</div>`;
  }).join('');
}

function tutTick() {
  if ($('intro')) return;
  const si = seasonIdx(); if (S.seasonSeen === undefined) S.seasonSeen = si;
  if (S.seasonSeen !== si && unl('season')) { S.seasonSeen = si; toast(`${SEASONS[si].i} ${SEASONS[si].n}になった。旬の作物と魚が変わる。`, 4000); tut('season'); }
  const w = (S.weather || {}).k; if (w && w !== 'sun' && unl('season')) tut('wx_' + w);
  if (curEvent()) tut('event');
  if (!S.extSeen) S.extSeen = {};
  if (unl('expand')) for (const k in FAC) if (FAC[k].grp === 'ext' && !(FAC[k].gate && !unl(FAC[k].gate)) && !S.extSeen[k] && facReqOk(k)) { S.extSeen[k] = 1; if (!S.fac[k]) { toast(`🔨 店の拡張「${FAC[k].name}」が建てられるようになった（施設タブ）`, 4500); tut('expand'); } }
  if (merchantHere() && S.merAnn !== gday()) { S.merAnn = gday(); toast('🐴 行商人ドルンの荷馬車が広場に来ている（22時まで）', 4500); tut('merchant'); }
  if (S.newsQ && S.newsQ.length && !tutOpen) popStory(S.newsQ.shift());
  storyTick(); bioNoticeTick(); flushStories(); showTut();
}
// ----- critic
function criticSchedule() { if (!S.critic) S.critic = {}; if (rankIdx() < 1 || !unl('critic')) return; if (!S.critic.at) { const d = gday() + 2 + Math.floor(Math.random() * 3); S.critic = {at:d * 1440 + 600 + Math.floor(Math.random() * 480), tries:0}; } }
const criticToday = () => S.critic && S.critic.at && Math.floor(S.critic.at / 1440) === gday();
function criticStep(vis) {
  criticSchedule(); const c = S.critic; if (!c || !c.at) return;
  if (criticToday() && (!S.tut || !S.tut.critic_soon)) tut('critic_soon');
  if (S.t < c.at) return;
  if (!isOpenNow()) { c.at += 60; return; }
  const avail = []; for (let i = 0; i < shelfCount(); i++) if (S.shelf[i].n > 0 && !S.shelf[i].draft) avail.push(i);
  let fromStore = null; if (!avail.length) { for (const k in S.dish) if (S.dish[k] > 0 && (!fromStore || dval(k) > dval(fromStore))) fromStore = k; }
  if (fromStore) { add(S.dish, fromStore, -1); S.shelf.push({key:fromStore, g:false, n:1, price:dval(fromStore), _tmp:1}); avail.push(S.shelf.length - 1); }
  if (!avail.length) { c.tries++; c.at += 60; if (c.tries >= 4) { S.rep = Math.max(0, S.rep - 2); S.critic = {}; pushReview({name:'—', stars:0, text:'評論家が来店したが、棚に料理がなく帰ってしまった。'}); } return; }
  const i = avail.reduce((b, j) => dval(S.shelf[j].key, S.shelf[j].g) > dval(S.shelf[b].key, S.shelf[b].g) ? j : b, avail[0]), s = S.shelf[i];
  const v = dval(s.key, s.g), q = dqOf(s.key), t = dishTaste(s.key), ratio = s.price / v, d = dishInfo(s.key);
  const wb = S.shelfWare && S.shelfWare[i] ? 1 : 0, mst = mastLv(s.key);
  let sc = .6 + (outfitOn('gown') ? .3 : 0) + (q - 1) * 1.2 + (ratio <= 1 ? 1 : ratio <= 1.2 ? .5 : -.6) + (Math.max(...t) >= 4 ? .5 : 0) + (t.reduce((a, b) => a + b, 0) >= 8 ? .4 : 0) + (mst >= 3 ? .4 : 0) + wb * .5 + (s.g ? 1 : 0) + (s.key[0] === 'c' ? -.5 : 0) + (inSeasonDish(s.key) ? .4 : 0);
  const stars = Math.max(1, Math.min(5, Math.round(1 + sc)));
  const parts = [];
  parts.push(q >= 2.5 ? '素材の質が素晴らしい。' : q >= 1.7 ? '素材は悪くない。' : '素材にもう一工夫ほしい。');
  parts.push(ratio <= 1 ? 'この値段でこの味は良心的だ。' : ratio <= 1.2 ? '値段は妥当。' : '少々値が張りすぎる。');
  if (Math.max(...t) >= 4) parts.push(`${TLABEL[t.indexOf(Math.max(...t))].replace('料理', '')}味がはっきりしていて印象に残る。`);
  if (wb) parts.push('器の美しさも一流だ。'); if (s.g) parts.push('金色の輝きには思わず息をのんだ。');
  if (inSeasonDish(s.key)) parts.push('旬の素材を活かしている。');
  { const tip = []; if (q < 1.8) tip.push('品質★（水やり・肥料・旬の作物・金色の食材）'); if (ratio > 1) tip.push('値段を適正以下に'); if (!wb) tip.push('棚に器を置く'); if (mst < 3) tip.push('同じ料理を作りこんで熟練度★3に'); if (!inSeasonDish(s.key)) tip.push('旬の食材を使う');
    if (stars < 5 && tip.length) parts.push(`<span style="color:var(--sub)">（次に★を増やすには：${tip.slice(0, 3).join('／')}）</span>`); }
  S.gold += s.price; s.n--; S.stat.sold++;
  S.rep = Math.max(0, Math.min(100, S.rep + (stars - 3) * 4));
  let bonus = ''; if (stars >= 4) { S.buzzT = S.t + 1440; bonus = '記事が話題になり、1日のあいだ客が増える！'; } if (stars >= 5) { S.gold += 1000; bonus += '<br>金の星章を授与された（+1,000G）'; }
  pushReview({name:d.name, stars, text:parts.join('')}); dayTrack().critic = {stars};
  S.critic = {}; dirty = true; S.shelf = S.shelf.filter(x => !x._tmp);
  popStory(`<div class="tst">${charHTML('noble', U * 22)}<div><div class="tth">料理評論家 ヴァルモン</div><div class="hearts">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div></div></div><div class="ttx">「${d.name}」を食べて――<br>${parts.join('<br>')}</div><div class="trw">評判 ${stars >= 3 ? '+' : ''}${(stars - 3) * 4}${bonus ? '<br>' + bonus : ''}</div>`, () => tut('critic'));
}
function pushReview(r) { if (!S.reviews) S.reviews = []; S.reviews.unshift({...r, day:gday()}); S.reviews = S.reviews.slice(0, 6); }
function inSeasonDish(key) { return dishInfo(key).ings.some(id => inSeason(id) === true); }

// ----- contest
const RIVALS = ['金獅子亭のレオン', '港食堂のマリサ', '放浪料理人ギン'];
const FISHY = new Set([...POND, ...PIER].map(g => g.id).concat(['blindfish', 'nushi_pond', 'nushi_pier', 'nushi_lake', 'smoked_salmon', 'himono']));
const MEATY = new Set(['beef', 'pork', 'chicken', 'boar', 'dark_chicken', 'icebeast_meat', 'meikemono', 'lizard_tail']);
function contestTheme() {
  const m = Math.floor(gday() / 7);
  if (!S.contest || S.contest.m !== m) { const r = (m * 7919) % 15; S.contest = {m, th: r < 8 ? {k:'m', v:METHODS[r]} : r < 13 ? {k:'t', v:r - 8} : {k:'i', v:r === 13 ? 'fish' : 'meat'}, done:false}; }
  return S.contest;
}
const themeName = th => th.k === 'm' ? MLABEL[th.v] : th.k === 't' ? TLABEL[th.v] : th.v === 'fish' ? '魚料理' : '肉料理';
function themeFit(key, th) { const d = dishInfo(key); if (th.k === 'm') return d.method === th.v; if (th.k === 't') return dishTaste(key)[th.v] >= 3; return d.ings.some(id => (th.v === 'fish' ? FISHY : MEATY).has(id)); }
const contestOpen = () => weekDay() >= 4 && unl('contest');
function contestHTML() {
  if (!unl('contest')) return '';
  const c = contestTheme();
  if (!contestOpen()) return `<div class="h">🏆 今週の料理コンテスト（木〜日曜）</div><div class="p">テーマ：<b>${themeName(c.th)}</b>　今のうちに良い料理を用意しておこう。</div>`;
  if (c.done) return `<div class="h">🏆 今週の料理コンテスト</div><div class="p">今週は出品済み（結果：${c.res}）。来週のテーマは週の初め（月曜）に発表。</div>`;
  return `<div class="h">🏆 料理コンテスト開催中！ テーマ：${themeName(c.th)}</div><div class="btn big grn" data-contest="1">出品する料理を選ぶ</div>`;
}
function openContest() {
  const c = contestTheme(), items = [];
  for (const g of [false, true]) { const src = g ? S.dishG : S.dish; const keys = new Set([...Object.keys(src), ...S.bag.filter(x => x && x.k === 'd' && !!x.g === g).map(x => x.key), ...S.shelf.filter(x => x.n > 0 && !!x.g === g).map(x => x.key)]); for (const key of keys) if (haveDish(key, g) > 0) items.push({key, g, fit:themeFit(key, c.th), v:dval(key, g)}); }
  items.sort((a, b) => (b.fit - a.fit) || (b.v - a.v));
  const html = `<div class="p">テーマ：<b>${themeName(c.th)}</b>。テーマに合わない料理は大きく減点。価値・品質★・旬で採点される。出品した料理はなくなる。</div>` + (items.length ? items.slice(0, 30).map((x, i) => `<div class="row">${dishIcHTML(x.key, U * 11, x.g)}<div class="t"><b>${x.g ? '金色の' : ''}${dishInfo(x.key).name}</b><span>${x.fit ? '<span style="color:#8ad08a">テーマに合う</span>' : '<span style="color:#d88a6a">テーマ外</span>'}　価値 ${fmt(x.v)}G　${qHTML(dqOf(x.key))}</span></div><div class="btn" data-ent="${i}">出品</div></div>`).join('') : '<div class="p">倉庫や持ち物に料理がない。</div>');
  modal('料理コンテスト', html, 'contest');
  bind('[data-ent]', d => { const x = items[+d.ent]; if (!takeDish(x.key, x.g, 1)) return; runContest(x); });
}
function runContest(x) {
  const c = contestTheme(), known = Object.keys(S.known.r).map(i => REC[i].value).sort((a, b) => b - a).slice(0, 5);
  const base = Math.max(40, known.length ? known.reduce((a, b) => a + b, 0) / known.length : 40) * (.75 + .05 * rankIdx());
  const me = Math.round(x.v * (x.fit ? 1 : .35) * (1 + (dqOf(x.key) - 1) * .15) * (inSeasonDish(x.key) ? 1.1 : 1) * rnd(.92, 1.08));
  const list = RIVALS.map(n => ({n, s:Math.round(base * rnd(.6, 1.25))})).concat([{n:'宵闇亭（あなた）', s:me, me:1}]).sort((a, b) => b.s - a.s);
  const pl = list.findIndex(o => o.me) + 1, rk = rankIdx();
  const prize = [500 * (1 + rk), 200 * (1 + rk), 80 * (1 + rk), 0][pl - 1];
  S.gold += prize; S.rep = Math.min(100, S.rep + [5, 3, 1, 0][pl - 1]);
  let item = ''; if (pl === 1) { add(S.inv, 'moon_extract', 1); S.known.i.moon_extract = true; S.trophy = (S.trophy || 0) + 1; item = '<br>賞品：月光エキス×1（倉庫へ）・優勝トロフィー'; }
  c.done = true; c.res = pl + '位'; dirty = true; sfx(pl === 1 ? 'ok' : 'coin');
  modal('コンテスト結果', `<div class="result"><div class="p">テーマ「${themeName(c.th)}」　出品：${dishInfo(x.key).name}</div>${list.map((o, i) => `<div class="row" style="${o.me ? 'background:#3a2616' : ''}"><div class="t"><b>${i + 1}位　${o.n}</b><span>${o.s} 点</span></div></div>`).join('')}
    <div class="nm">${pl}位${pl === 1 ? '　優勝！' : ''}</div><div class="p">${prize ? '賞金 ' + fmt(prize) + 'G' : '入賞ならず……来週こそ！'}${item}</div></div><div class="btn big" data-a="ok">閉じる</div>`, 'contestres');
  bind('[data-a]', closeModal);
}

// ====================================================== v0.11: shop expansion (kitchen / 2F seats / terrace / bar / inn)
const UTABLES = [[6,80],[50,80],[6,122],[50,122],[6,164],[50,164]];
const ROOMS = [10, 58, 106];
const TERR_T = [[104,92],[104,146]];
const isNightHm = () => { const h = hmNow(); return h >= 1080 || h < 120; };
const DRINKS = ['wine', 'sake'];
const facReqOk = k => { const r = FAC[k].req; if (!r) return true; if (r.sold && S.stat.sold < r.sold) return false; if (rankIdx() < (r.rank || 0)) return false; for (const [f, lv] of Object.entries(r.fac || {})) if ((S.fac[f] || 0) < lv) return false; return true; };
const facReqText = k => { const r = FAC[k].req, p = []; if (r.sold) p.push(`料理を${r.sold}個売る（${Math.min(S.stat.sold, r.sold)}/${r.sold}）`); if (r.rank) p.push(`店の格「${RANKS[r.rank].n}」`); for (const [f, lv] of Object.entries(r.fac || {})) p.push(`${FAC[f].name} Lv${lv}`); return p.join('・'); };
SCENES.upstairs = {name:'宵闇亭　2階', short:'2階', objs:[
  {id:'down', lb:'階段：1階へ降りる', r:[4,238,30,292], st:[38,266], act:() => go('interior', 31, 296)},
  ...ROOMS.map((x, i) => ({id:'room' + i, lb:`客室${i + 1}`, r:[x, 12, x + 22, 36], st:[x + 11, 42], act:() => i < (S.fac.inn || 0) ? openInn() : lockedMsg('inn')})),
  ...UTABLES.map(([tx, ty], i) => ({id:'ut' + i, lb:'2階の客席', r:[tx, ty - 4, tx + 36, ty + 18], st:[tx + 18, ty + 28], act:() => i < (S.fac.upstairs || 0) * 2 ? openUp() : lockedMsg('upstairs')})),
  {id:'terrace', lb:'テラス席', r:[98,70,136,194], st:[110,128], act:() => S.fac.terrace ? openUp() : lockedMsg('terrace')},
  {id:'bar', lb:'酒場カウンター', r:[24,196,144,224], st:[86,244], act:() => S.fac.bar ? openBar() : lockedMsg('bar')},
  {id:'bath', lb:'大浴場', r:[92,246,138,292], st:[86,270], act:() => S.fac.bath ? openBathInfo() : lockedMsg('bath')},
]};
SCENES.farm.objs.push({id:'court', lb:'中庭の席', r:[8,350,60,392], st:[40,346], act:() => S.fac.courtyard ? openCourtInfo() : lockedMsg('courtyard')}, {id:'court2', lb:'中庭の席', r:[84,350,136,392], st:[104,346], act:() => S.fac.courtyard ? openCourtInfo() : lockedMsg('courtyard')});
WALKDEF.upstairs = {areas:[[2,36,142,61],[40,58,56,70],[2,67,93,195],[93,108,98,130],[98,67,135,195],[2,195,22,228],[2,226,142,296]],
  blocks:[...UTABLES.map(([tx, ty]) => [tx - 1, ty - 6, tx + 37, ty + 23]), ...TERR_T.map(([tx, ty]) => [tx - 5, ty - 1, tx + 25, ty + 12]), [96,66,110,80], [122,176,136,194], [3,236,31,294], [92,246,138,292]]};
SCENES.interior.objs.push({id:'stairs', lb:'階段：2階へ', r:[22,300,40,326], st:[31,296], cond:() => S.fac.upstairs > 0, act:() => go('upstairs', 38, 266)});
WALKDEF.interior.blocks.push([22,302,40,328]);

function drawUpstairs() {
  const up = S.fac.upstairs || 0, slot = Math.floor(S.t / 25), night = isNightHm(), sunny = !wxOn('rain') && !wxOn('storm');
  const occ = (i, p) => { const h = Math.sin((slot + 1) * 12.9898 + i * 78.233) * 43758.5453; return h - Math.floor(h) < p; };
  UTABLES.forEach(([tx, ty], i) => { if (i >= up * 2) { lockArea(tx - 1, ty - 6, tx + 37, ty + 23, i % 2 === 0); return; }
    if (occ(i, .55)) drawChar(CUST_KINDS[(i + slot) % CUST_KINDS.length], tx + 8, ty + 3, false, true);
    if (occ(i + 20, .35)) drawChar(CUST_KINDS[(i + slot + 3) % CUST_KINDS.length], tx + 28, ty + 3, true, true); });
  if (!S.fac.terrace) lockArea(97, 67, 136, 196, true);
  else TERR_T.forEach(([tx, ty], i) => { if (sunny && occ(i + 40, .6)) drawChar(CUST_KINDS[(i + slot + 1) % CUST_KINDS.length], tx - 2, ty + 9, false, true); });
  if (!S.fac.bar) lockArea(24, 196, 144, 238, true);
  else if (night) for (let k = 0; k < 7; k++) if (occ(k + 60, .5)) drawChar(CUST_KINDS[(k + slot) % CUST_KINDS.length], 36 + k * 16, 238, false, true);
  if (!S.fac.bath) lockArea(92, 246, 138, 292, true); else drawBath();
  ROOMS.forEach((x, i) => { if (i >= (S.fac.inn || 0)) lockArea(x, 12, x + 23, 37); else if (S.inn && i < S.inn.guests && (night || hmNow() < 420)) { ctx.fillStyle = '#ffcc66'; ctx.fillRect(x + 10, 10, 3, 2); } });
}
function drawBath() {
  ctx.fillStyle = '#2a1a12'; ctx.fillRect(94, 248, 42, 42); ctx.fillStyle = '#4a3020'; ctx.fillRect(96, 250, 38, 38);
  ctx.fillStyle = '#1a3a5a'; ctx.fillRect(98, 266, 34, 20); ctx.fillStyle = '#3a6a8a'; for (let i = 0; i < 6; i++) ctx.fillRect(100 + i * 5 + ((tNow * 3 | 0) % 2), 270 + (i % 2) * 6, 3, 1);
  ctx.fillStyle = '#7a1a1a'; ctx.fillRect(96, 250, 18, 12); ctx.fillStyle = '#1a2a5a'; ctx.fillRect(116, 250, 18, 12);
  ctx.fillStyle = '#e8d8c0'; ctx.fillRect(103, 253, 3, 1); ctx.fillRect(104, 254, 1, 4); ctx.fillRect(102, 257, 4, 1); ctx.fillRect(123, 253, 3, 1); ctx.fillRect(124, 254, 1, 4); ctx.fillRect(122, 256, 4, 1);
  for (let i = 0; i < 4; i++) { const y = 264 - ((tNow * 6 + i * 5) % 18); ctx.fillStyle = `rgba(230,230,240,${.25 - (264 - y) / 90})`; ctx.fillRect(102 + i * 8 + Math.round(Math.sin(tNow + i) * 1.5), y, 2, 2); }
  const lv = S.fac.bath; for (let k = 0; k < lv; k++) if (Math.sin(Math.floor(S.t / 30) * 7.1 + k * 3.3) > -.2) drawChar(['beard', 'knight', 'traveler'][k], 104 + k * 11, 286, k % 2 === 1, true);
}
function drawCourtyard() {
  // v0.61 まん中は丘の農地への道としてあける（左右に分けて席を置く）
  const lv = S.fac.courtyard || 0; if (!lv) { lockArea(8, 352, 62, 392, true); lockArea(82, 352, 136, 392, true); drawHillSign(); return; }
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(8, 354, 54, 36); ctx.fillRect(82, 354, 54, 36); ctx.fillStyle = '#5a4430'; for (let x = 10; x < 134; x += 8) { if (x > 56 && x < 84) continue; ctx.fillRect(x, 356, 6, 32); }
  const slot = Math.floor(S.t / 25), sunny = !wxOn('rain') && !wxOn('storm');
  for (let i = 0; i < lv * 2; i++) { const tx = [12, 36, 86, 110][i % 4], ty = 362 + Math.floor(i / 4) * 16;
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(tx, ty + 4, 22, 7); ctx.fillStyle = '#8a6a44'; ctx.fillRect(tx + 1, ty + 4, 20, 5); ctx.fillStyle = '#e8d8b0'; ctx.fillRect(tx + 10, ty + 2, 2, 2);
    const h = Math.sin((slot + 1) * 12.9898 + i * 78.233) * 43758.5453; if (sunny && h - Math.floor(h) < .6 && isOpenNow()) drawChar(CUST_KINDS[(i + slot) % CUST_KINDS.length], tx + 4, ty + 6, false, true); }
  drawHillSign();
  for (const x of [10, 134]) { ctx.fillStyle = '#2a1e16'; ctx.fillRect(x, 340, 1, 14); ctx.fillStyle = isDark() ? '#ffcc66' : '#a88a5a'; ctx.fillRect(x - 1, 338, 3, 3); }
}
function drawHillSign() { if (!unl('hill')) return;   // 丘の農地への小さな道しるべ
  ctx.fillStyle = '#3a2614'; ctx.fillRect(65, 380, 1, 9); ctx.fillStyle = '#7a5232'; ctx.fillRect(58, 376, 14, 5); ctx.fillStyle = '#e8d8a0'; ctx.fillRect(60, 378, 7, 1); ctx.fillRect(68, 377, 1, 3); ctx.fillRect(69, 378, 1, 1); }
function openBathInfo() { const b = S.fac.bath || 0; modal('大浴場', `<div class="p">大浴場 Lv${b}：宿の泊まり客 +${b * 12}%、宿泊料 +${b * 30}%、朝食代 +${b * 10}%。<br>今の宿泊料：1人 ${fmt(innFee())}G</div>`, 'bath'); }
function openCourtInfo() { const c = S.fac.courtyard || 0; modal('中庭の席', `<div class="p">中庭の席 Lv${c}：客足 +${c * 6}%。晴れた昼は、畑の作物を使った料理の価値 +${c * 10}%（今日：${!wxOn('rain') && !wxOn('storm') ? '営業中' : '雨で閉鎖中'}）。</div>`, 'court'); }
function openUp() {
  const up = S.fac.upstairs || 0, t = S.fac.terrace || 0;
  const html = `<div class="p">2階の客席 Lv${up}：席 ${up * 4}　客足 +${up * 12}%　追加注文 ${up * 12}%（買った客が、もう1品頼むことがある）</div>
    ${t ? `<div class="p">テラス席 Lv${t}：旬の食材を使った料理の価値 +${t * 12}%。雨や嵐でない日は客足 +${t * 8}%（今日：${!wxOn('rain') && !wxOn('storm') ? '営業中' : '閉鎖中'}）</div>` : `<div class="p">🔒 テラス席：${facReqText('terrace')}</div>`}`;
  modal('2階の客席', html, 'upseat');
}
function openBar() {
  const lv = S.fac.bar || 0, have = DRINKS.map(id => ({id, n:haveIng(id), g:haveIng(id, true)}));
  const html = `<div class="p">夜（18時〜翌2時）になると、倉庫のお酒を自動で売る。ワインは魔導蒸留器、酒は醸造樽で作れる。${lv >= 2 ? '<br>Lv2：夜は焼き料理と揚げ物の価値 +15%（おつまみ）' : ''}</div>
    ${have.map(x => `<div class="row">${ingIc(x.id, U * 11, false, true)}<div class="t"><b>${ingName(x.id)}</b><span>在庫 ${x.n}${x.g ? `（金色 ${x.g}）` : ''}　1杯 ${fmt(drinkPrice(x.id, false))}G</span></div></div>`).join('')}
    <div class="p">今は${isNightHm() ? '<b style="color:#ffcc66">営業中</b>' : '準備中（18時から）'}。今夜の売上 ${fmt((S.barN || {}).g || 0)}G</div>`;
  modal('酒場カウンター', html, 'bar');
}
const drinkPrice = (id, g) => Math.round(ING[INGI[id]].value * (g ? 3 : 1) * 2.5 * ((S.fac.bar || 0) >= 4 ? 1.35 : (S.fac.bar || 0) >= 2 ? 1.2 : 1));
function openInn() {
  const lv = S.fac.inn || 0, I = S.inn || {};
  const html = `<div class="p">客室 ${lv}部屋。毎晩19時に旅人が泊まりに来る（評判が高いほど埋まる）。宿泊料は1人 ${fmt(innFee())}G。<br>翌朝7時に倉庫の料理から朝食を出す（ご飯もの・蒸し料理・卵やパンの料理が好まれ、価値の1.3倍を払う）。朝食がないと評判が下がる。<br>泊まり客はときどき、まだ知らないレシピの噂を話してくれる。</div>
    <div class="p">今夜の泊まり客：${I.guests || 0}人　これまでの宿泊：${I.total || 0}人</div>`;
  modal('宿屋', html, 'inn');
}
const innFee = () => Math.round(120 * (1 + rankIdx()) * (1 + .25 * Math.max(0, (S.fac.inn || 0) - 3)) * (1 + .3 * (S.fac.bath || 0)));
const BF_ING = new Set(['egg', 'rice', 'bread', 'milk', 'butter', 'tofu', 'miso']);
function bfScore(key) { const d = dishInfo(key); return dval(key, false) * ((d.method === '炊く' || d.method === '蒸す' || d.ings.some(id => BF_ING.has(id))) ? 1.6 : 1); }
function expStep(dt, vis) {
  // bar
  if (S.fac.bar) {
    if (!S.barN || S.barN.d !== gday() - (hmNow() < 120 ? 1 : 0)) S.barN = {d:gday() - (hmNow() < 120 ? 1 : 0), g:0};
    if (isNightHm()) {
      S.tm.bar = (S.tm.bar === undefined ? 30 : S.tm.bar) - dt * (S.fac.bar) * (1 + .1 * rankIdx());
      while (S.tm.bar <= 0) { S.tm.bar += 40; const id = DRINKS.find(x => (S.inv[x] || 0) > 0 || (S.invG[x] || 0) > 0); if (!id) break;
        const gg = !((S.inv[id] || 0) > 0); add(gg ? S.invG : S.inv, id, -1); const p = drinkPrice(id, gg); S.gold += p; S.barN.g += p; S.stat.earned += p; rep_.bar = (rep_.bar || 0) + p;
        if (vis && scene === 'upstairs') floatAt(86, 206, `🍷 +${p}G`, 'info'); }
    }
  }
  // inn
  if (S.fac.inn) {
    if (!S.inn) S.inn = {guests:0, ci:-1, bf:-1, total:0};
    const I = S.inn, h = hmNow(), day = gday();
    if (h >= 1140 && I.ci !== day) { I.ci = day; let n = 0; for (let k = 0; k < Math.min(3, S.fac.inn); k++) if (Math.random() < .45 + S.rep / 200 + .12 * (S.fac.bath || 0)) n++; I.guests = n; I.total = (I.total || 0) + n; const fee = n * innFee(); S.gold += fee; S.stat.earned += fee; rep_.inn = (rep_.inn || 0) + fee; if (n) tut('inn_first'); }
    if (h >= 420 && h < 1140 && I.bf !== day && I.ci === day - 1) { I.bf = day;
      for (let k = 0; k < I.guests; k++) {
        let best = null; for (const [src, g] of [[S.dish, false], [S.dishG, true]]) for (const key in src) if (src[key] > 0) { const v = bfScore(key) * (g ? 3 : 1); if (!best || v > best.v) best = {key, g, v}; }
        if (!best) { S.rep = Math.max(0, S.rep - 1); continue; }
        add(best.g ? S.dishG : S.dish, best.key, -1); const p = Math.round(dval(best.key, best.g) * 1.3 * (1 + .1 * (S.fac.bath || 0))); S.gold += p; S.stat.earned += p; S.rep = Math.min(100, S.rep + .5 * repDim()); rep_.inn = (rep_.inn || 0) + p;
        if (Math.random() < .35) { const un = REC.map((x, i) => i).filter(i => !S.known.r[i] && !S.learned[i] && !S.near[i] && !SECRET_R.has(i)); if (un.length) { const ri = pick(un); S.near[ri] = true; if (vis) toast(`🛏 泊まり客の噂：「${REC[ri].method}料理で、${REC[ri].ings.length}品使う『${REC[ri].name}』という料理があるらしい」<br>（レシピ帳の「惜しい」欄に記録）`, 5000); } }
      }
      I.guests = 0; }
  }
}

// ====================================================== v0.12: wilds scene / merchant / stall / staff levels
// ----- wilds (森と浜)
const FOR_SPOTS = {forest:[[30,40],[100,62],[44,92],[108,140],[28,170],[96,190],[46,214],[120,226],[90,82],[20,130],[60,150],[112,100]],
  beach:[[30,292],[48,326],[22,352],[80,318],[40,380],[66,300],[44,404],[20,320],[60,360],[30,426]]};
SCENES.wilds = {name:'霧の森と月光の浜', short:'森と浜', objs:[
  {id:'up', lb:'霧月通りへ戻る', r:[54,0,90,14], st:[72,18], act:() => go('outside', 72, 308)},
  {id:'shrine', lb:'森の祠に祈る', r:[6,78,32,106], st:[34,100], act:() => prayShrine()},
  {id:'pool1', lb:'潮だまりを探る', r:[24,310,44,322], st:[36,330], act:() => tidePool(0)},
  {id:'pool2', lb:'潮だまりを探る', r:[48,398,68,410], st:[44,394], act:() => tidePool(1)},
  {id:'wreck', lb:'難破船を調べる', r:[2,416,46,456], st:[52,428], act:() => searchWreck()},
  {id:'trapB', lb:'かご罠（浜）', r:[76,290,98,312], st:[70,304], act:() => openTrap('beach')},
  {id:'fire', lb:'たき火', r:[60,332,80,348], st:[70,356], act:() => toast('たき火のそばは暖かい。波の音が聞こえる……')},
]};
WALKDEF.wilds = {areas:[[2,16,142,250],[56,248,88,272],[2,270,98,300],[2,300,88,330],[2,330,78,360],[2,360,68,392],[2,392,58,420],[48,420,56,440]],
  blocks:[[0,106,51,126],[83,106,144,126],[6,76,32,106],[90,152,126,164],[60,332,80,348],[0,414,46,458],[8,294,20,306],[34,336,46,344],[12,386,28,398],[68,366,84,378],[24,310,44,322],[48,398,68,410],
    ...[[10,22],[132,16],[26,62],[122,74],[6,156],[136,150],[28,196],[118,204],[104,38],[38,8]].map(([x, y]) => [x - 3, y, x + 3, y + 14])]};
SCENES.outside.objs = SCENES.outside.objs.filter(o => o.id !== 'trapB');
SCENES.outside.objs.push(
  {id:'toWilds', lb:'森と浜へ（採集場）', r:[52,314,92,330], st:[72,310], act:() => !unl('forage') ? gateMsg('forage') : isDark() ? toast('夜の森と浜は危ない。明るくなってから（5時以降）にしよう。') : go('wilds', 72, 20)},
  {id:'stall', lb:'屋台：出張販売', r:[4,290,40,322], st:[46,300], act:() => openStallPrep()},
  {id:'forge', lb:'鍛冶小屋：ガルド', r:[2,238,50,280], st:[54,262], act:() => openForgeHut()},
  {id:'wagon', lb:'行商人ドルンの荷馬車', r:[100,262,140,292], st:[96,298], cond:() => merchantHere(), act:() => openMerchant()},
  {id:'rival', lb:'白昼亭', r:[99,94,143,146], st:[110,158], cond:() => unl('rival'), act:() => openRival()},
  {id:'fuku', lb:'福引きと宝くじ', r:[42,284,66,306], st:[70,300], cond:() => unl('lottery'), act:() => openFuku()},
  {id:'townsign', lb:'町の発展計画', r:[90,290,108,306], st:[86,302], cond:() => unl('town'), act:() => openTown()},
  {id:'fountain', lb:'広場の泉：料理決闘', r:[58,256,86,274], st:[72,280], act:() => unl('duel') ? openDuelMenu() : toast('広場の泉。月の光が水面に揺れている。')});
WALKDEF.outside = {areas:[[2,118,142,326]], blocks:[...WALKDEF.outside.blocks.filter(b => b[1] < 238), [0,238,8,330], [136,238,144,330], [56,250,88,276], [2,236,50,281], [4,298,40,322], [98,260,140,293], [0,308,52,330], [92,308,144,330]]};
function spawnForage() {
  for (const z of ['forest', 'beach']) if (S.forage.filter(f => f.z === z).length < 5 && Math.random() < .75) {
    const pool = ING.filter(g => g.src[0] === 'forage' && g.src[1] === z), g = pick(pool), free = FOR_SPOTS[z].filter(([x, y]) => !S.forage.some(f => Math.abs(f.x - x) < 6 && Math.abs(f.y - y) < 6));
    if (!free.length) continue; const [x, y] = pick(free); S.forage.push({z, id:g.id, x:x + (rnd(-2, 2) | 0), y:y + (rnd(-2, 2) | 0), v:2}); }
}
function prayShrine() {
  if (S.prayDay === gday()) return toast('祠の灯りが静かに揺れている。（祈りは1日1回）');
  S.prayDay = gday(); S.luckT = Math.max(S.luckT, S.t) + 300; sfx('ok'); dirty = true;
  toast('森の祠に手を合わせた。<br>✨ 5分間、金色の食材が出やすくなる。', 3500);
}
function tidePool(i) {
  if (!S.pools) S.pools = {}; if (S.pools[i] === gday()) return toast('潮だまりはもう空っぽだ。明日また潮が満ちる。');
  S.pools[i] = gday(); const id = pick(['asari', 'asari', 'crab', 'shrimp', 'scallop', 'octopus']);
  withQ(2, () => giveBag('i', id, false, 1 + (Math.random() < .4 ? 1 : 0))); S.stat.foraged = (S.stat.foraged || 0) + 1; sfx('pop'); toast(`潮だまりで${ingName(id)}を見つけた！`);
}
function searchWreck() {
  if (S.wreckDay === gday()) return toast('難破船はもう調べ尽くした。明日、波が何かを運んでくるかも。');
  S.wreckDay = gday(); const r = Math.random(); sfx('pop'); dirty = true;
  if (r < .45) { const g = 40 + Math.floor(Math.random() * 160); S.gold += g; toast(`古い木箱から ${g}G 分の銀貨が出てきた！`); }
  else if (r < .75) { const id = pick(['kelp', 'salt', 'bait']); giveBag('i', id, false, 3); toast(`${ingName(id)}×3 を拾った。`); }
  else if (r < .93) { const id = pick(['amethyst', 'silver', 'ruby']); giveBag('i', id, false, 1); S.known.i[id] = true; toast(`船底で${ingName(id)}を見つけた！`); }
  else { const un = REC.map((x, k) => k).filter(k => !S.known.r[k] && !S.learned[k] && !SECRET_R.has(k)); if (un.length) { const ri = pick(un); S.learned[ri] = true; toast(`瓶の中の手紙はレシピだった！『${REC[ri].name}』を覚えた。`, 4500); } }
}
function drawWilds() {
  // fireflies in the forest
  for (let k = 0; k < 16; k++) { const x = (k * 37 + Math.sin(tNow * .6 + k) * 18 + 144) % 144, y = 20 + (k * 53) % 220 + Math.cos(tNow * .8 + k * 2) * 6; if (Math.sin(tNow * 2.5 + k * 1.7) > .2) { ctx.fillStyle = k % 3 ? 'rgba(210,255,140,.9)' : 'rgba(140,255,230,.9)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); } }
  // waves & moon shimmer
  for (let y = 272; y < 440; y += 3) { const xs = 104 - (y - 270) * .32 + Math.sin(y / 9) * 3 + Math.sin(tNow * 1.4 + y * .2) * 1.5; ctx.fillStyle = 'rgba(220,235,245,.55)'; ctx.fillRect(Math.round(xs), y, 1, 1); }
  for (let k = 0; k < 6; k++) if (Math.sin(tNow * 3 + k * 2.1) > .5) { ctx.fillStyle = '#e8f0ff'; ctx.fillRect(120 + ((k * 5) % 9), 300 + k * 18, 2, 1); }
  for (let i = 0; i < S.traps.beach.n; i++) drawChar('trap', 84 + i * 5, 300 + (i % 2) * 6);
  if (S.prayDay !== gday() && Math.sin(tNow * 2) > 0) { ctx.fillStyle = '#ffe08a'; ctx.fillRect(19, 74, 1, 2); }
}

// ----- merchant (仕入れ商人)
const merchantHere = () => unl('merchant') && [2, 6].includes(weekDay()) && hmNow() >= 600 && hmNow() < 1320;
function merStock() {
  if (!S.mer) S.mer = {n:0}; const day = gday();
  if (S.mer.day === day) return S.mer.items;
  let seed = day * 9301 + 49297; const rr = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const items = [];
  for (const id of ['saffron', 'vanilla', 'truffle', 'spice', 'dragonfruit', 'caviar', 'phoenix_egg']) if (rr() < (id === 'phoenix_egg' ? .3 : id === 'caviar' ? .45 : .7)) items.push({k:'i', id, n:3 + Math.floor(rr() * 6), price:Math.round(ING[INGI[id]].src[1] * (.85 + rr() * .4))});
  if (rr() < .7) items.push({k:'i', id:'fert3', n:3, price:Math.round(60 * (.9 + rr() * .3))});
  if (rr() < .35) items.push({k:'i', id:'moon_extract', n:1, price:1200});
  if (unl('fishing') && rr() < .5) items.push({k:'tk', id:'phantom', n:1, price:2100});
  const bk = D.books.filter(b => !S.books[b.id] && b.recipes.some(n => { const i = REC.findIndex(r => r.name === n); return i >= 0 && !S.known.r[i] && !S.learned[i]; }));
  const m1 = D.books.find(b => b.id === 'm1'); if (m1 && !S.books.m1) items.push({k:'book', id:'m1', n:1, price:Math.round(m1.price * .8)});
  if (bk.length && rr() < .6) { const b = bk[Math.floor(rr() * bk.length)]; if (b.id !== 'm1') items.push({k:'book', id:b.id, n:1, price:Math.round(b.price * .8)}); }
  if (S.fac.greenhouse) for (const id of ['mandrake', 'nightshade', 'moonshroom']) if (rr() < .4) items.push({k:'seed', id, n:5, price:Math.round(ING[INGI[id]].src[1] * .7)});
  S.mer.day = day; S.mer.items = items; dirty = true; return items;
}
const merDisc = () => { const n = (S.mer || {}).n || 0; return n >= 30 ? .85 : n >= 15 ? .9 : n >= 5 ? .95 : 1; };
function openMerchant() {
  if (!merchantHere()) return toast('行商人は、毎週火曜と土曜の10時〜22時に広場に来る。');
  const items = merStock(), dc = merDisc();
  const nm = x => x.k === 'book' ? '本：' + D.books.find(b => b.id === x.id).name : x.k === 'tk' ? TKI[x.id].n : x.k === 'seed' ? ingName(x.id) + 'の種' : ingName(x.id);
  const ic = x => x.k === 'book' ? icHTML(D.bookIcon, U * 11, 'atlas') : x.k === 'tk' ? tkIcon(x.id, U * 11) : ingIc(x.id, U * 11, false, true);
  const html = `<div class="tst">${charHTML('traveler', U * 18)}<div><div class="tth">行商人ドルン</div><div class="ttx" style="font-size:calc(var(--f)*2.9)">「やあ、宵闇亭の。今日も珍しい品を持ってきたよ」<br>なじみ割引 ${Math.round((1 - dc) * 100)}%（これまで ${S.mer.n}回）</div></div></div>` +
    items.map((x, i) => `<div class="row" style="${x.n ? '' : 'opacity:.45'}">${ic(x)}<div class="t"><b>${nm(x)}</b><span>${x.k === 'i' ? (DESC_[x.id] || '') : x.k === 'book' ? '市場より安く手に入る' : x.k === 'seed' ? '温室で育つ幻想の作物' : 'ヌシ専用のルアー（30回）'}　残り ${x.n}</span></div><div class="btn ${x.n && S.gold >= Math.round(x.price * dc) ? '' : 'dis'}" data-mb="${i}">${fmt(Math.round(x.price * dc))}G</div></div>`).join('');
  modal('行商人の荷馬車', (unl('auction') ? `<div class="btn big ${aucToday() ? 'grn' : ''}" data-auc="1" style="margin-bottom:${U * 1.5}px">🔨 ${aucToday() ? '今日は競りの日' : '競り（入札を預ける）'}：${aucLot().d}</div>` : '') + html, 'merchant');
  bind('[data-auc]', () => openAuction());
  bind('[data-mb]', d => { const x = items[+d.mb], p = Math.round(x.price * dc); if (!x.n || S.gold < p) return; S.gold -= p; x.n--; S.mer.n++; S.stat.merchant = (S.stat.merchant || 0) + 1;
    if (x.k === 'i') { withQ(2, () => giveBag('i', x.id, false, 1)); S.known.i[x.id] = true; }
    else if (x.k === 'tk') S.tackle[x.id] = tkHave(x.id) + 30;
    else if (x.k === 'seed') add(S.seeds, x.id, x.n + 1), x.n = 0;
    else { const b = D.books.find(b => b.id === x.id); S.books[b.id] = true; const n = learnRecipes(b.recipes.map(n => REC.findIndex(r => r.name === n))); toast(`『${b.name}』を読んだ。${n}品のレシピを覚えた！`); }
    sfx('coin'); dirty = true; openMerchant(); });
}
const DESC_ = {dragonfruit:'南国の派手な果実', caviar:'高級な魚卵', phoenix_egg:'伝説の温かい卵', saffron:'米が黄金色に', vanilla:'菓子の香りづけ', truffle:'森の黒いダイヤ', spice:'カレーや焼き物に', fert3:'畑にまくと品質と成長が大きく上がる', moon_extract:'30分間、金色の食材が出やすい'};

// ----- stall (出張販売)
let stallSt = null;
const stallSlots = () => 3 + (S.fac.stall || 1);
function openStallPrep() {
  if (!unl('stall')) return gateMsg('stall');
  if (!(hmNow() >= 1080 || hmNow() < 120)) return toast('広場の夜市は18時〜翌2時。閉店後に屋台を出そう。');
  if (S.stallDay === gday()) return toast('今日はもう出張販売に行った。明日また行ける。');
  const list = [];
  for (const [src, g] of [[S.dish, false], [S.dishG, true]]) for (const key of new Set([...Object.keys(src), ...S.shelf.filter(x => x.n > 0 && !!x.g === g).map(x => x.key)])) if (haveDish(key, g) > 0) list.push({key, g, n:Math.min(8, haveDish(key, g)), v:dval(key, g)});
  list.sort((a, b) => b.v - a.v);
  if (!openStallPrep.sel || openStallPrep.day !== gday()) { openStallPrep.sel = new Set(list.slice(0, stallSlots()).map(x => x.key + (x.g ? '*' : ''))); openStallPrep.day = gday(); }
  const sel = openStallPrep.sel;
  const html = `<div class="p">広場の夜市（18時〜翌2時）に屋台を出す（1日1回）。持っていく料理を最大${stallSlots()}品選ぶ（1品につき最大8皿）。<br>お客の吹き出しと同じ料理をタップして渡そう。続けて正しく渡すとコンボで高く売れる。${curEvent() ? '<br>🎐 今日は行事の日：売値+20%' : ''}</div>` +
    (list.length ? list.slice(0, 30).map((x, i) => { const k = x.key + (x.g ? '*' : ''); return `<div class="row ${sel.has(k) ? 'sel' : ''}" data-st="${i}">${dishIcHTML(x.key, U * 11, x.g)}<div class="t"><b>${x.g ? '金色の' : ''}${dishInfo(x.key).name}</b><span>${x.n}皿　価値 ${fmt(x.v)}G</span></div><div class="btn ${sel.has(k) ? 'grn' : ''}">${sel.has(k) ? '持っていく' : '置いていく'}</div></div>`; }).join('') : '<div class="p">倉庫に料理がない。先に料理を作ろう。</div>') +
    `<div class="btn big grn ${sel.size ? '' : 'dis'}" data-go="1">広場へ出発（制限時間 ${20 + 10 * (S.fac.stall || 1)}秒）</div>`;
  modal('出張販売の準備', html, 'stallprep');
  bind('[data-st]', d => { const x = list[+d.st], k = x.key + (x.g ? '*' : ''); if (sel.has(k)) sel.delete(k); else if (sel.size < stallSlots()) sel.add(k); else return toast(`持っていけるのは${stallSlots()}品まで（屋台を強化すると増える）`); openStallPrep(); });
  bind('[data-go]', () => { const items = list.filter(x => sel.has(x.key + (x.g ? '*' : ''))); if (!items.length) return; closeModal(); startStall(items); });
}
const CATS = [{t:'甘いもの！', f:k => dishTaste(k)[0] >= 3}, {t:'辛いもの！', f:k => dishTaste(k)[1] >= 3}, {t:'さっぱりしたもの！', f:k => dishTaste(k)[2] >= 3}, {t:'旨いもの！', f:k => dishTaste(k)[4] >= 3},
  {t:'揚げ物！', f:k => dishInfo(k).method === '揚げる'}, {t:'焼いたやつ！', f:k => dishInfo(k).method === '焼く'}, {t:'ご飯もの！', f:k => dishInfo(k).method === '炊く'}, {t:'炒め物！', f:k => dishInfo(k).method === '炒める'}, {t:'さっぱり和え物！', f:k => dishInfo(k).method === '和える'}, {t:'あったかいの！', f:k => dishInfo(k).method === '煮る' || dishInfo(k).method === '蒸す'}];
function startStall(items) {
  $('stallv').style.backgroundImage = `url(${BLOBU.bg_stall || (BLOBU.bg_stall = b64Blob(A.bg_stall))})`;
  const lv = S.fac.stall || 1;
  stallSt = {items:items.map(x => ({...x, left:x.n})), T:20 + 10 * lv, t:0, cust:[null, null, null], next:.6, combo:0, maxc:0, sales:0, served:0, missed:0, pat:7 * (1 + .15 * (lv - 1)), done:false};
  $('stallv').classList.add('show'); renderStall(); tut('stall'); sfx('door');
}
function stallReq() {
  const av = stallSt.items.filter(x => x.left > 0); if (!av.length) return null;
  if (Math.random() < .3) { const cs = CATS.filter(c => av.some(x => c.f(x.key))); if (cs.length) { const c = pick(cs); return {cat:c}; } }
  return {item:pick(av)};
}
function renderStall() {
  const st = stallSt;
  $('sbar').innerHTML = `<div><b>残り ${Math.max(0, Math.ceil(st.T - st.t))}秒</b><span>売上 ${fmt(st.sales)}G</span></div><div class="scombo ${st.combo >= 3 ? 'hot' : ''}">${st.combo ? st.combo + ' コンボ！' : ''}</div><div class="fx" id="sxx">×</div>`;
  $('sxx').onpointerdown = e => { e.stopPropagation(); endStall(); };
  $('scust').innerHTML = st.cust.map((c, i) => !c ? '<div class="sc"></div>' : `<div class="sc ${c.mood || ''}"><div class="sbub">${c.mood === 'ok' ? '😊' : c.mood === 'ng' ? '😠' : c.req.item ? dishIcHTML(c.req.item.key, U * 13, c.req.item.g) : `<span>${c.req.cat.t}</span>`}</div>${charHTML(c.k, U * 26)}<div class="spat"><i style="width:${Math.max(0, c.p / c.p0) * 100}%;background:${c.p / c.p0 > .35 ? '#7ac87a' : '#e06a4a'}"></i></div></div>`).join('');
  $('sdish').innerHTML = st.items.map((x, i) => `<div class="sdb ${x.left ? '' : 'out'}" data-sd="${i}">${dishIcHTML(x.key, U * 13, x.g)}<b>${x.left}</b></div>`).join('');
  $('sdish').querySelectorAll('[data-sd]').forEach(el => el.onpointerdown = e => { e.stopPropagation(); serveStall(+el.dataset.sd, el); });
}
function serveStall(i, el) {
  const st = stallSt; if (!st || st.done) return; const x = st.items[i]; if (!x.left) return;
  const cand = st.cust.map((c, k) => ({c, k})).filter(o => o.c && !o.c.mood && (o.c.req.item ? o.c.req.item === x : o.c.req.cat.f(x.key))).sort((a, b) => a.c.p - b.c.p)[0];
  if (!cand) { st.combo = 0; sfx('break'); el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 300); st.cust.forEach(c => { if (c && !c.mood) c.p -= .8; }); renderStall(); return; }
  if (!takeDish(x.key, x.g, 1)) { x.left = 0; renderStall(); return; }
  x.left--; st.combo++; st.maxc = Math.max(st.maxc, st.combo); st.served++;
  const p = Math.round(dval(x.key, x.g) * (1.1 + .04 * Math.min(st.combo, 12)) * (curEvent() ? 1.2 : 1) * (cand.c.req.cat ? 1.1 : 1));
  st.sales += p; S.gold += p; S.stat.sold++; S.stat.earned += p; rivalTrack(x.key, p); cand.c.mood = 'ok'; cand.c.leave = .5; sfx('coin');
  const f = document.createElement('div'); f.className = 'sfloat'; f.textContent = '+' + fmt(p) + 'G'; f.style.left = (17 + cand.k * 33) + '%'; $('stallv').appendChild(f); setTimeout(() => f.remove(), 900);
  renderStall();
}
function stallUpdate(dt) {
  const st = stallSt; if (st.done) return; st.t += dt; let ch = false;
  st.cust.forEach((c, i) => { if (!c) return; if (c.mood) { c.leave -= dt; if (c.leave <= 0) { st.cust[i] = null; ch = true; } return; }
    c.p -= dt; if (c.p <= 0) { c.mood = 'ng'; c.leave = .6; st.combo = 0; st.missed++; sfx('tick'); ch = true; } });
  st.next -= dt;
  if (st.next <= 0 && st.t < st.T - 2) { const fr = st.cust.map((c, i) => c ? -1 : i).filter(i => i >= 0); const rq = stallReq();
    if (fr.length && rq) { const p0 = st.pat * rnd(.85, 1.15); st.cust[pick(fr)] = {k:pick(CUST_KINDS.concat(['noble'])), req:rq, p:p0, p0}; ch = true; } st.next = rnd(.5, 1.4) / (1 + st.t / st.T * .6); }
  if (st.t >= st.T || !st.items.some(x => x.left > 0)) return endStall();
  if (ch || (frame.n % 6 === 0)) renderStall();
}
function endStall() {
  const st = stallSt; if (!st || st.done) return; st.done = true;
  const rp = Math.min(6, st.served * .25) * repDim(); S.rep = Math.min(100, S.rep + rp); S.stallDay = gday(); S.stat.stall = (S.stat.stall || 0) + 1;
  if (!S.stallBest || st.sales > S.stallBest) S.stallBest = st.sales; dirty = true; sfx('ok');
  $('scust').innerHTML = ''; $('sdish').innerHTML = '';
  $('sbar').innerHTML = '';
  $('sres').innerHTML = `<div class="tcard"><div class="tth">🏮 出張販売の結果</div><div class="ttx">売上 <b>${fmt(st.sales)}G</b><br>お客 ${st.served}人に販売（逃したお客 ${st.missed}人）<br>最大コンボ ${st.maxc}<br>評判 +${rp.toFixed(1)}${S.stallBest === st.sales ? '<br>★ 自己ベスト！' : ''}<br><span style="color:var(--sub)">売れ残りは倉庫に戻った。屋台は「施設」で強化できる。</span></div><div class="btn big" id="sok">店に戻る</div></div>`;
  $('sok').onclick = () => { $('sres').innerHTML = ''; $('stallv').classList.remove('show'); stallSt = null; renderHot(); };
}

// ----- staff levels
const EMP_NAMES = {brewer:['トキ', 'ゲン', 'ハナ', 'ロッコ', 'ウメ', 'ザック'], cook:['ゴードン', 'マルタ', 'ジロー', 'エマ', 'ルカ', 'サナ', 'ボリス'], clerk:['ミナ', 'ヨハン', 'リリ', 'トマ', 'ネル', 'ユノ'], farmer:['ハンス', 'モモ', 'タロ', 'ベル', 'オズ', 'キキ', 'グレン'], fisher:['シオ', 'ガフ', 'ナギ', 'マリン', 'イサ'], miner:['ドワ', 'ゴロ', 'テツ', 'ラギ', 'バズ']};
const EPERK = {
  brewer:[[{id:'fast', n:'手早い', d:'仕込みが15%速い'}, {id:'thrift', n:'節約上手', d:'買った材料代の2割が戻る'}], [{id:'double', n:'目利き', d:'12%で出来上がりが1つ多い'}, {id:'night', n:'夜なべ', d:'加工器具の加工が10%速い'}]],
  cook:[[{id:'fast', n:'手早い', d:'調理が15%速い'}, {id:'plate', n:'盛り付け上手', d:'作る料理の品質+0.3'}], [{id:'gold', n:'名料理人', d:'8%で金色の料理になる'}, {id:'thrift', n:'節約上手', d:'材料の自動仕入れが2割引'}]],
  clerk:[[{id:'talk', n:'話し上手', d:'客足+5%'}, {id:'eye', n:'目利き', d:'自動値付けの売値+5%'}], [{id:'idol', n:'看板娘', d:'評判の上がり方+20%'}, {id:'up', n:'すすめ上手', d:'追加注文+8%'}]],
  farmer:[[{id:'fast', n:'手早い', d:'作業が15%速い'}, {id:'season', n:'旬の名人', d:'収穫する作物の品質+0.4'}], [{id:'bumper', n:'豊作', d:'15%で収穫+1'}, {id:'soil', n:'土づくり', d:'畑の成長+8%'}]],
  fisher:[[{id:'fast', n:'手早い', d:'釣りが15%速い'}, {id:'big', n:'大物狙い', d:'釣る魚の品質+0.5'}], [{id:'rare', n:'幻の釣り師', d:'珍しい魚が掛かりやすい'}, {id:'gold', n:'金鱗', d:'金色の魚+5%'}]],
  miner:[[{id:'fast', n:'手早い', d:'採掘が15%速い'}, {id:'deep', n:'深掘り', d:'いちばん深い層の鉱石を掘る'}], [{id:'double', n:'二つ掘り', d:'15%で2個'}, {id:'gem', n:'宝石の目', d:'宝石が出やすい'}]],
};
function syncEmp() {
  if (!S.emp) S.emp = {};
  for (const k in STAFF) { const a = S.emp[k] || (S.emp[k] = []);
    while (a.length < S.staff[k]) { const used = new Set(a.map(e => e.nm)), fr = EMP_NAMES[k].filter(n => !used.has(n)), nm = pick(fr.length ? fr : EMP_NAMES[k]); a.push({nm, xp:0, p5:null, p10:null}); }
    if (a.length > S.staff[k]) a.length = S.staff[k]; }
}
const eLv = e => Math.min(10, 1 + Math.floor(Math.sqrt(e.xp / 12)));
const morale = () => S.mealT > S.t ? 1.2 : 1;
function eSpd(k, i) { syncEmp(); const e = S.emp[k][i]; if (!e) return 1; if (isAway(e)) return 0; return (e.master ? 1.4 : 1) * (k === 'cook' && uniOn('white') ? 1.05 : 1) * (1 + .05 * (eLv(e) - 1)) * (e.p5 === 'fast' ? 1.15 : 1) * morale(); }
const eSum = k => { syncEmp(); let s = 0; for (let i = 0; i < S.staff[k]; i++) s += eSpd(k, i); return s; };
function perkN(k, id) { syncEmp(); return S.emp[k].filter(e => e.p5 === id || e.p10 === id).length; }
function eXp(k, i, n = 1) {
  syncEmp(); const a = S.emp[k]; if (!a.length) return; const e = a[i == null ? Math.floor(Math.random() * a.length) : i]; if (!e) return;
  const before = eLv(e); e.xp += n * (1 + .25 * nrL('staff')); const after = eLv(e);
  if (after > before) { if (after === 5 || after === 10) { S.empNew = 1; tut('staff_lv'); } if (typeof toast === 'function' && !simulating) toast(`👥 ${STAFF[k].name}の${e.nm}が Lv${after} になった！${after === 5 || after === 10 ? '<br>得意技を選べる（従業員タブ）' : ''}`, 3200); }
}
let simulating = false;
function staffHTML() {
  syncEmp(); const B = budget(); let h = `<div class="row"><div class="t"><b>倉庫に残す数（各料理）</b><span>店員が棚に出すとき、倉庫に残しておく皿数。コンテスト・宴会・依頼・裏営業・出張販売・迷宮の食事に使える。料理人はコンテストや宴会の前に、必要な料理を先に作って取っておく</span><div style="display:flex;gap:2px;margin-top:2px">${[0, 3, 5, 10].map(p => `<div class="btn ${(S.keepN == null ? 3 : S.keepN) === p ? 'grn' : ''}" data-kp="${p}" style="padding:2px 6px">${p}皿</div>`).join('')}</div></div></div>` + `<div class="row"><div class="t"><b>自動仕入れの予算（1日）</b><span>料理人の材料・農夫の種を市場で買う上限。朝6時に、その時の所持金の${S.buyPct || 40}%で決まる（所持金の25%は必ず残す）<br>今日：${fmt(B.spent)} / ${fmt(B.cap)}G</span><div style="display:flex;gap:2px;margin-top:2px">${[20, 40, 60, 80].map(p => `<div class="btn ${(S.buyPct || 40) === p ? 'grn' : ''}" data-bp="${p}" style="padding:2px 6px">${p}%</div>`).join('')}</div></div></div>` + `<div class="p">働くほど経験を積んでレベルが上がる（作業が速くなる）。Lv5とLv10で得意技を1つ選べる。${S.mealT > S.t ? '<br><b style="color:#8ad08a">🍙 まかない効果中：全員の作業+20%</b>' : ''}</div>
    <div class="row"><div class="t"><b>まかないを出す</b><span>倉庫の料理を1品ふるまう。30分間、全員の作業が20%速くなり、経験も少し入る</span></div><div class="btn ${dishTotal() ? '' : 'dis'}" data-meal="1">ふるまう</div></div>`;
  for (const k in STAFF) for (const [i, e] of S.emp[k].entries()) {
    const lv = eLv(e), nx = lv < 10 ? Math.pow(lv, 2) * 12 : null, pv = Math.pow(lv - 1, 2) * 12;
    const pk = (tier, cur) => cur ? `<span class="chipin ok">${EPERK[k][tier].find(p => p.id === cur).n}</span>` : EPERK[k][tier].map(p => `<div class="btn" data-perk="${k}|${i}|${tier}|${p.id}" style="margin:2px 2px 0 0">${p.n}<br><small>${p.d}</small></div>`).join('');
    h += `<div class="row">${charHTML(STAFF[k].icon, U * 12)}<div class="t"><b>${e.nm}（${STAFF[k].name}）Lv${lv}</b><span>速さ ×${eSpd(k, i).toFixed(2)}</span><div class="bar"><i style="width:${nx ? (e.xp - pv) / (nx - pv) * 100 : 100}%"></i></div>
      ${lv >= 5 ? `<div style="margin-top:2px">${pk(0, e.p5)}</div>` : ''}${lv >= 10 ? `<div>${pk(1, e.p10)}</div>` : ''}${trainBtn(k, i, e)}</div></div>`;
  }
  return h;
}

// ====================================================== v0.13: interior decoration (内装)
const DKEYS = ['lamp_rustic','lamp_crystal','lamp_iron','lamp_gold','lamp_paper','plant','cauldron','crystalball','armor','shield','clock','statue','bonsai','screen','catstatue','gemcase',
  'floor_rustic','floor_witch','floor_knight','floor_noble','floor_east','cloth_rustic','cloth_witch','cloth_knight','cloth_noble','cloth_east'];
const THEMES = {rustic:{n:'素朴な木造', c:'#c8a070'}, witch:{n:'魔女の隠れ家', c:'#b088e8', kinds:['witch', 'demon', 'hood'], d:'魔女・魔族・旅の少年が来やすい'}, knight:{n:'騎士の酒場', c:'#a8b8d8', kinds:['knight', 'beard', 'lizard'], d:'騎士・職人・旅商人が来やすい／焼き料理と肉料理+3%'},
  noble:{n:'貴族のサロン', c:'#e8c060', kinds:['noble'], d:'貴族が来やすい／金色の料理+3%'}, east:{n:'東方の茶屋', c:'#d86a5a', kinds:['traveler', 'hood'], d:'旅人が来やすい／生もの・ご飯もの・蒸し料理+3%'}};
const DECOR = [
  {id:'floor_rustic', s:'floor', n:'板張りの床', t:'rustic', base:1}, {id:'floor_witch', s:'floor', n:'紫のじゅうたん', t:'witch', p:6000, need:{amethyst:2}}, {id:'floor_knight', s:'floor', n:'石畳の床', t:'knight', p:6000, need:{iron:10}},
  {id:'floor_noble', s:'floor', n:'金糸の赤じゅうたん', t:'noble', p:12000, need:{gold:3}}, {id:'floor_east', s:'floor', n:'畳', t:'east', p:6000},
  {id:'cloth_rustic', s:'cloth', n:'木のテーブルのまま', t:'rustic', base:1}, {id:'cloth_witch', s:'cloth', n:'星柄のテーブルクロス', t:'witch', p:3000}, {id:'cloth_knight', s:'cloth', n:'紋章のテーブルクロス', t:'knight', p:3000},
  {id:'cloth_noble', s:'cloth', n:'金縁の白いクロス', t:'noble', p:6000}, {id:'cloth_east', s:'cloth', n:'藍染めのクロス', t:'east', p:3000},
  {id:'lamp_rustic', s:'light', n:'壁のランタン', t:'rustic', base:1}, {id:'lamp_crystal', s:'light', n:'浮かぶ水晶灯', t:'witch', p:8000, need:{amethyst:3, moonstone:1}}, {id:'lamp_iron', s:'light', n:'鉄の燭台', t:'knight', p:4000, need:{iron:6}},
  {id:'lamp_gold', s:'light', n:'金の燭台', t:'noble', p:12000, need:{gold:4}}, {id:'lamp_paper', s:'light', n:'提灯', t:'east', p:4000},
  {id:'plant', s:'deco', n:'鉢植え', t:'rustic', base:1}, {id:'catstatue', s:'deco', n:'黒猫の置物', t:'rustic', p:1500, fx:'評判の上がり方+5%'}, {id:'cauldron', s:'deco', n:'魔女の大釜', t:'witch', p:5000},
  {id:'crystalball', s:'deco', n:'水晶玉', t:'witch', p:7000, need:{amethyst:2}}, {id:'armor', s:'deco', n:'鎧の置物', t:'knight', p:7000, need:{iron:8}}, {id:'shield', s:'deco', n:'盾と剣の壁飾り', t:'knight', p:4000, need:{iron:4}},
  {id:'clock', s:'deco', n:'振り子時計', t:'noble', p:9000, need:{gold:2}}, {id:'statue', s:'deco', n:'女神像', t:'noble', p:12000, need:{silver:6}}, {id:'bonsai', s:'deco', n:'盆栽', t:'east', p:4000},
  {id:'screen', s:'deco', n:'屏風', t:'east', p:6000}, {id:'gemcase', s:'deco', n:'宝石の飾り棚', t:'noble', p:15000, need:{ruby:1, sapphire:1, emerald:1}, fx:'全ての客足+5%'},
];
const DECI = {}; DECOR.forEach(x => DECI[x.id] = x);
const DSLOTS = [['floor', '床'], ['cloth', 'テーブル'], ['light', '照明'], ['d1', '飾り：入口の横'], ['d2', '飾り：左の壁'], ['d3', '飾り：右の壁']];
const DSPOT = {d1:[120, 294], d2:[2, 182], d3:[127, 238]};
const LAMPS = [[4,196],[137,196],[4,250],[137,250],[4,304],[137,304]];
function decorState() { if (!S.decor) S.decor = {own:{}, eq:{floor:'floor_rustic', cloth:'cloth_rustic', light:'lamp_rustic', d1:'plant', d2:null, d3:null}}; return S.decor; }
function themeCount() { const D = decorState(), c = {}; for (const [k] of DSLOTS) { const id = D.eq[k]; if (!id) continue; const t = DECI[id].t; if (!DECI[id].base) c[t] = (c[t] || 0) + 1; } return c; }
function fullSet() { const D = decorState(); const ts = DSLOTS.map(([k]) => D.eq[k] && DECI[D.eq[k]].t); return ts.every(t => t && t !== 'rustic' && t === ts[0]) ? ts[0] : null; }
function decorRate() { if (!S.decor) return plcMul('out') * medalMul('trade'); const c = themeCount(); let n = 0; for (const t in c) if (t !== 'rustic') n += c[t]; return (1 + .02 * n) * (fullSet() ? 1.1 : 1) * (Object.values(S.decor.eq).includes('gemcase') ? 1.05 : 1) * plcMul('out') * medalMul('trade'); }
function decorKindMul(k) { if (!S.decor) return 1; const c = themeCount(); let m = 1; for (const t in c) if (THEMES[t].kinds && THEMES[t].kinds.includes(k)) m += .25 * c[t]; return m; }
function decorValMul(key, g) { if (!S.decor) return 1; const c = themeCount(), d = dishInfo(key); let m = 1;
  if (c.knight && (d.method === '焼く' || d.method === '炒める' || d.ings.some(id => MEATY.has(id)))) m += .03 * c.knight;
  if (c.noble && g) m += .03 * c.noble;
  if (c.east && ['生', '炊く', '蒸す', '和える'].includes(d.method)) m += .03 * c.east; return m; }
const decorRep = () => (S.decor && Object.values(S.decor.eq).includes('catstatue') ? 1.05 : 1) * plcMul('in');
function decIcon(id, px) { const i = DKEYS.indexOf(id), sc = px / 20; return `<div class="ic" style="width:${16 * sc}px;height:${px}px;background-image:url(${BLOBU.decor || (BLOBU.decor = b64Blob(A.decor))});background-size:${DKEYS.length * 16 * sc}px ${px}px;background-position:-${i * 16 * sc}px 0;image-rendering:pixelated"></div>`; }
let decTab = 'floor';
function openDecor() {
  if (!unl('decor')) return gateMsg('decor');
  if (decTab === 'outfit') return openOutfit();
  const D = decorState(), c = themeCount(), fs = fullSet();
  const sum = Object.keys(c).filter(t => t !== 'rustic').map(t => `<span class="chipin" style="color:${THEMES[t].c}">${THEMES[t].n}×${c[t]}</span>`).join('') || '<span style="color:var(--sub)">まだ飾っていない</span>';
  let html = `<div class="p">家具や飾りを買って置き換えると、店の雰囲気が変わる。同じテーマで揃えるほど、そのテーマの客が来やすくなる。6か所すべて同じテーマにすると「テーマ完成」で客足+10%。</div>
    <div class="p">今の内装：${sum}${fs ? `<br><b style="color:${THEMES[fs].c}">✨ テーマ完成：${THEMES[fs].n}</b>` : ''}<br>客足 ×${decorRate().toFixed(2)}</div>
    <div class="seg">${[['floor', '床'], ['cloth', 'テーブル'], ['light', '照明'], ['deco', '飾り'], ['outfit', '衣装']].map(([k, n]) => `<div class="${decTab === k ? 'on' : ''}" data-dt="${k}">${n}</div>`).join('')}</div>`;
  for (const x of DECOR.filter(x => x.s === decTab)) {
    const own = x.base || D.own[x.id], th = THEMES[x.t], slots = x.s === 'deco' ? ['d1', 'd2', 'd3'] : [x.s], on = slots.filter(k => D.eq[k] === x.id);
    const btn = !own ? `<div class="btn ${S.gold >= x.p && (!x.need || needOk(x.need)) ? '' : 'dis'}" data-db="${x.id}">買う<br>${fmt(x.p)}G</div>`
      : x.s === 'deco' ? `<div style="display:flex;flex-direction:column;gap:2px">${slots.map((k, i) => `<div class="btn ${D.eq[k] === x.id ? 'grn' : ''}" data-dp="${x.id}|${k}" style="padding:2px 6px">${['入口', '左壁', '右壁'][i]}</div>`).join('')}</div>`
      : `<div class="btn ${on.length ? 'grn' : ''}" data-dp="${x.id}|${x.s}">${on.length ? '使用中' : '使う'}</div>`;
    html += `<div class="row">${decIcon(x.id, U * 13)}<div class="t"><b>${x.n}</b><span style="color:${th.c}">${th.n}</span><span>${x.base ? '最初からある' : (x.fx || th.d || '')}${x.need ? '<br>素材：' + needHTML(x.need) : ''}</span></div>${btn}</div>`;
  }
  if (decTab === 'deco') html += `<div class="btn" data-dclr="1">飾りを全部片づける</div>`;
  modal('内装', html, 'decor');
  bind('[data-dt]', d => { decTab = d.dt; openDecor(); });
  bind('[data-db]', d => { const x = DECI[d.db]; if (S.gold < x.p || (x.need && !needOk(x.need))) return; S.gold -= x.p; if (x.need) for (const [k, n] of Object.entries(x.need)) takeIng(k, false, n); D.own[x.id] = 1; sfx('coin'); dirty = true; toast(`${x.n}を買った！「使う」で店に置ける。`); openDecor(); });
  bind('[data-dp]', d => { const [id, k] = d.dp.split('|'); if (DECI[id].s === 'deco') { for (const s of ['d1', 'd2', 'd3']) if (D.eq[s] === id) D.eq[s] = null; D.eq[k] = D.eq[k] === id ? null : id; } else D.eq[k] = id;
    sfx('pop'); dirty = true; const f = fullSet(); if (f && S.decorFull !== f) { S.decorFull = f; toast(`✨ テーマ完成：${THEMES[f].n}！ 客足+10%`, 4000); } openDecor(); });
  bind('[data-dclr]', () => { D.eq.d1 = D.eq.d2 = D.eq.d3 = null; dirty = true; openDecor(); });
}
const sprDec = (id, x, y) => { const i = DKEYS.indexOf(id); ctx.drawImage(IMG.decor, i * 16, 0, 16, 20, x, y, 16, 20); };
function drawDecor() {
  const D = decorState(), F = DECI[D.eq.floor], CL = DECI[D.eq.cloth];
  if (F && !F.base) {
    const [a, b] = {witch:['rgba(70,30,110,.38)', 'rgba(150,110,220,.3)'], knight:['rgba(90,90,110,.4)', 'rgba(140,140,160,.25)'], noble:['rgba(130,20,30,.4)', 'rgba(220,170,60,.4)'], east:['rgba(120,120,60,.38)', 'rgba(170,170,90,.3)']}[F.t];
    ctx.save(); ctx.fillStyle = a; ctx.globalCompositeOperation = 'multiply'; ctx.fillRect(4, 184, 136, 140); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = b; ctx.lineWidth = 1;
    if (F.t === 'east') { for (let y = 186; y < 324; y += 16) for (let x = 4; x < 140; x += 32) ctx.strokeRect(x + ((y / 16) % 2) * 16 + .5, y + .5, 31, 15); }
    else if (F.t === 'knight') { for (let y = 186; y < 324; y += 5) { ctx.beginPath(); ctx.moveTo(4, y + .5); ctx.lineTo(140, y + .5); ctx.stroke(); } }
    else { ctx.strokeRect(14.5, 192.5, 115, 126); ctx.strokeRect(18.5, 196.5, 107, 118); }
    ctx.restore(); }
  if (CL && !CL.base) {
    const c = {witch:['#2a1a4a', '#e8d070'], knight:['#1e3a6a', '#c8c8d0'], noble:['#e8e0d0', '#c8a040'], east:['#1e2e5a', '#e8e0d0']}[CL.t];
    TABLES.forEach(([tx, ty]) => { ctx.fillStyle = c[0]; ctx.fillRect(tx + 1, ty, 43, 11); ctx.fillStyle = c[1]; ctx.fillRect(tx + 1, ty + 10, 43, 1); ctx.fillRect(tx + 1, ty, 43, 1);
      for (let k = 4; k < 42; k += 6) ctx.fillRect(tx + 1 + k, ty + 11, 1, 2); const cx = tx + 22; ctx.fillStyle = '#c8bea8'; ctx.fillRect(cx, ty + 2, 2, 5); ctx.fillStyle = '#fff0b0'; ctx.fillRect(cx, ty, 1, 1); }); }
  const LI = DECI[D.eq.light];
  if (LI && !LI.base) { const col = {witch:'110,224,208', knight:'255,150,70', noble:'255,210,120', east:'255,110,80'}[LI.t];
    LAMPS.forEach(([x, y]) => { sprDec(LI.id, x - 7 + (x > 70 ? -2 : 2), y - 13); const g = ctx.createRadialGradient(x + 1, y - 4, 1, x + 1, y - 4, 22); g.addColorStop(0, `rgba(${col},.28)`); g.addColorStop(1, `rgba(${col},0)`); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - 22, y - 26, 46, 46); ctx.restore(); }); }
  for (const k of ['d1', 'd2', 'd3']) if (D.eq[k]) sprDec(D.eq[k], DSPOT[k][0], DSPOT[k][1]);
}

// ====================================================== v0.14: breeding & mutation (品種改良・突然変異)
const HYB = [['tomato','strawberry','tomaberry'],['potato','sweetpotato','goldpotato'],['chili','pepper','dragonpepper'],['cabbage','spinach','jadeleaf'],['pumpkin','corn','sunpumpkin'],
  ['rice','wheat','starrice'],['moonshroom','shiitake','moonshiitake'],['eggplant','nightshade','abyssplum'],['garlic','onion','blackgarlic']];
const HYBS = new Set(HYB.map(h => h[2]));
const brLv = id => ((S.breed || {})[id] || 0);
const labSlots = () => S.fac.lab || 0;
const breedTime = () => 240 / (1 + .3 * (labSlots() - 1));
function hybOf(a, b) { const h = HYB.find(h => (h[0] === a && h[1] === b) || (h[0] === b && h[1] === a)); return h ? h[2] : null; }
function breedStep(dt, vis) {
  if (!S.breedQ || !S.breedQ.length) return;
  for (const q of S.breedQ) if (!q.done) { q.t += dt; if (q.t >= breedTime()) { q.done = true; resolveBreed(q, vis); } }
  S.breedQ = S.breedQ.filter(q => !q.done);
}
function news(html) { if (!S.newsQ) S.newsQ = []; S.newsQ.push(html); dirty = true; }
function resolveBreed(q, vis) {
  const {a, b} = q; if (!S.breed) S.breed = {}; if (!S.hybFound) S.hybFound = {};
  const nm = id => ingName(id);
  let msg = '';
  if (a === b) {
    const lv = brLv(a);
    if (lv >= 3) { add(S.seeds, a, 3); msg = `${nm(a)}はもう最高の品種だ。種が少し増えた（×3）。`; }
    else if (Math.random() < [.6, .4, .25][lv]) { S.breed[a] = lv + 1; add(S.seeds, a, 2); msg = `🌱 品種改良に成功！<br><b>${nm(a)}</b>が品種Lv${lv + 1}になった。<br>${['成長が15%速くなる', '収穫の品質が上がる（+0.4）', '収穫量が1つ増える'][lv]}`; }
    else { add(S.seeds, a, 1); msg = `${nm(a)}の品種改良は、今回はうまくいかなかった……（種×1が戻った）`; }
  } else {
    const h = hybOf(a, b);
    if (h) { const first = !S.hybFound[h]; S.hybFound[h] = 1; add(S.seeds, h, 4); S.known.i[h] = true;
      let rec = ''; if (first) { const rs = REC.map((r, i) => i).filter(i => REC[i].ings.includes(h)); learnRecipes(rs); rec = `<br>新しいレシピ ${rs.map(i => '『' + REC[i].name + '』').join('')} を思いついた！`; }
      msg = `🧬 ${first ? '新しい作物が生まれた！' : '掛け合わせ成功！'}<br><b>${nm(a)} × ${nm(b)} → ${nm(h)}</b>（種×4）${rec}`; }
    else if (Math.random() < .12) { const un = HYB.filter(x => !S.hybFound[x[2]] && (x.includes(a) || x.includes(b))), pickH = un.length ? pick(un)[2] : pick(HYB)[2];
      S.hybFound[pickH] = 1; add(S.seeds, pickH, 2); S.known.i[pickH] = true; const rs = REC.map((r, i) => i).filter(i => REC[i].ings.includes(pickH)); learnRecipes(rs);
      msg = `✨ 突然変異！<br>思いがけず <b>${nm(pickH)}</b> の種×2 が生まれた！`; }
    else { add(S.seeds, pick([a, b]), 1); const hint = HYB.find(x => !S.hybFound[x[2]] && (x.includes(a) || x.includes(b)));
      msg = `${nm(a)}と${nm(b)}はうまく交わらなかった……（種×1が戻った）${hint ? `<br><span style="color:#8ad0c8">ヒント：${nm(hint.includes(a) ? a : b)}は「${nm(hint[0] === (hint.includes(a) ? a : b) ? hint[1] : hint[0])}」と相性が良さそうだ</span>` : ''}`; }
  }
  if (vis && !simulating) { popStory(`<div class="tth">🧪 交配台</div><div class="ttx">${msg}</div>`); sfx('ok'); } else news(`<div class="tth">🧪 交配台（留守中）</div><div class="ttx">${msg}</div>`);
}
let brSel = null;
function openBreed() {
  if (!unl('breed')) return gateMsg('breed');
  if (!labSlots()) return toast('「施設」で<b>交配台</b>を設置すると、種の掛け合わせができる。');
  if (!S.breedQ) S.breedQ = [];
  const seeds = [...new Set([...Object.keys(S.seeds), ...S.bag.filter(x => x && x.k === 's').map(x => x.id)])].filter(id => haveSeed(id) >= 2).sort((x, y) => ING[INGI[x]].value - ING[INGI[y]].value);
  let html = `<div class="p">種を2つずつ使って掛け合わせる（約${Math.round(breedTime() / 60)}分・留守中も進む）。<br>同じ種どうし＝<b>品種改良</b>（成長・品質・収穫量が上がる）／違う種どうし＝<b>新しい作物</b>や<b>突然変異</b>が生まれることがある。</div>`;
  html += `<div class="h">交配中（${S.breedQ.length}/${labSlots()}）</div>` + (S.breedQ.map(q => `<div class="row">${ingIc(q.a, U * 9, false, true)}<b style="margin:0 4px">×</b>${ingIc(q.b, U * 9, false, true)}<div class="t"><b>${ingName(q.a)} × ${ingName(q.b)}</b><div class="bar"><i style="width:${Math.min(100, q.t / breedTime() * 100)}%"></i></div></div></div>`).join('') || '<div class="p">空いている</div>');
  if (S.breedQ.length < labSlots()) {
    html += `<div class="h">${brSel ? `もう一方を選ぶ（1つ目：${ingName(brSel)}）` : '1つ目の種を選ぶ'}</div>` + (seeds.length ? `<div class="grid">${seeds.map(id => `<div class="cell ${brSel === id ? 'sel' : ''}" data-bs="${id}">${icHTML(ING[INGI[id]].icon, U * 12, 'atlas', null, 's:' + id)}<span class="n">${haveSeed(id)}</span>${brLv(id) ? `<span class="sdlv">Lv${brLv(id)}</span>` : ''}</div>`).join('')}</div>` : '<div class="p">2粒以上ある種がない。市場で買うか、種子づくり機で作ろう。</div>');
    if (brSel) html += `<div class="btn" data-bx="1">選び直す</div>`;
  }
  html += `<div class="h">新しい作物（${HYB.filter(h => (S.hybFound || {})[h[2]]).length}/${HYB.length}）</div><div class="grid">${HYB.map(h => { const f = (S.hybFound || {})[h[2]]; return `<div class="cell" data-tip="${f ? 'i:' + h[2] : ''}">${icHTML(ING[INGI[h[2]]].icon, U * 12, f ? 'atlas' : 'sil')}</div>`; }).join('')}</div>`;
  const lvs = Object.entries(S.breed || {}).filter(([, v]) => v > 0);
  if (lvs.length) html += `<div class="h">品種Lv</div><div class="p">${lvs.map(([id, v]) => `${ingName(id)} Lv${v}`).join('　')}</div>`;
  modal('交配台', html, 'breed');
  bind('[data-bs]', d => { if (!brSel) { brSel = d.bs; return openBreed(); }
    const a = brSel, b = d.bs; if (a === b && haveSeed(a) < 4) { toast('同じ種どうしは、4粒以上必要'); return; }
    takeSeed(a, 2); takeSeed(b, 2); S.breedQ.push({a, b, t:0}); brSel = null; sfx('pop'); dirty = true; tut('breed'); openBreed(); });
  bind('[data-bx]', () => { brSel = null; openBreed(); });
}

// ====================================================== v0.15: cooking card duel (料理決闘)
const DCOST_M = [0, .65, 1.1, 1.6];
const MBON = {'焼く':{dmg:2}, '煮る':{blk:3}, '揚げる':{mul:1.3}, '蒸す':{heal:2}, '生':{draw:1}, '炊く':{en:1}, '炒める':{dmg:1, blk:1}, '和える':{heal:1, draw:1}};
function cardOf(ri) {
  const r = REC[ri], key = 'r' + ri, t = dishTaste(key), mb = MBON[r.method] || {}, ml = Math.max(0, mastLv(key) - 1);
  const cost = r.ings.length <= 2 ? 1 : r.ings.length === 3 ? 2 : 3, cm = DCOST_M[cost];
  let dmg = t[4] ? 1 + 1.2 * t[4] + (mb.dmg || 0) + ml : (mb.dmg ? mb.dmg + 1 : 0);
  if (mb.mul && dmg) dmg *= mb.mul;
  dmg = Math.round(dmg * cm);
  const c = {ri, cost, dmg, blk:Math.round(((t[0] ? 1 + 1.2 * t[0] : 0) + (mb.blk || 0)) * cm), burn:t[1] ? Math.ceil(t[1] / 2) + (cost - 1) : 0, draw:(t[2] >= 4 ? 2 : t[2] >= 2 ? 1 : 0) + (mb.draw || 0), weak:t[3] >= 4 ? 2 : t[3] >= 2 ? 1 : 0, heal:mb.heal || 0, en:mb.en || 0};
  if (!c.dmg && !c.blk && !c.burn && !c.draw && !c.weak) c.dmg = Math.round(5 * cm);
  if (ULT_KEYS && ULT_KEYS.has('r' + ri)) { c.dmg = Math.round((c.dmg || 4) * 2); c.blk = Math.round((c.blk || 3) * 2); c.ult = 1; }
  const tl = typeof twLv === 'function' ? twLv(ri) : 0; if (tl) { c.dmg = Math.round(c.dmg * (1 + .15 * tl)); c.blk = Math.round(c.blk * (1 + .15 * tl)); if (c.burn) c.burn += Math.floor(tl / 3); c.tl = tl; }
  return c;
}
function cardText(c) { const p = []; if (c.dmg) p.push(`評価${c.dmg}`); if (c.blk) p.push(`守り${c.blk}`); if (c.burn) p.push(`辛さ${c.burn}`); if (c.weak) p.push(`弱気${c.weak}`); if (c.draw) p.push(`引く${c.draw}`); if (c.heal) p.push(`回復${c.heal}`); if (c.en) p.push(`次の火+${c.en}`); return p.join('・'); }
const DUEL_FOES = [
  {n:'見習い料理人ピコ', k:'hood', hp:48, pat:[['atk', 6], ['def', 5], ['atk', 7]]},
  {n:'港食堂のマリサ', k:'witch', hp:66, pat:[['atk', 7], ['buf', 2], ['atk', 5, 2], ['def', 8]]},
  {n:'放浪料理人ギン', k:'traveler', hp:84, pat:[['atk', 11], ['wk', 2], ['atk', 6, 2], ['def', 10]]},
  {n:'金獅子亭のレオン', k:'knight', hp:105, pat:[['buf', 3], ['atk', 9, 2], ['def', 12], ['atk', 16]]},
  {n:'井戸底の料理長ザハル', k:'demon', hp:140, pat:[['atk', 12], ['wk', 2], ['atk', 7, 3], ['buf', 3], ['def', 15], ['atk', 22]], boss:1},
];
let duel = null;
function duelDeckDefault() { const ks = Object.keys(S.known.r).map(Number); return ks.map(ri => ({ri, p:(c => (c.dmg + c.blk + c.burn * 2 + c.draw * 3 + c.weak * 3 + c.heal + c.en * 3) / (.6 + .4 * c.cost))(cardOf(ri))})).sort((a, b) => b.p - a.p).slice(0, 10).map(x => x.ri); }
function openDuelMenu() {
  if (!unl('duel')) return gateMsg('duel');
  if (!S.duelS) S.duelS = {best:0, wins:0, runs:0, deck:null};
  const D = S.duelS; if (!D.deck || !D.deck.length) D.deck = duelDeckDefault();
  D.deck = D.deck.filter(ri => S.known.r[ri]);
  const html = `<div class="p">覚えた料理をカードにして戦う、5人勝ち抜きの料理決闘。<br>毎ターン「火」3つでカードを出す（カードの左上の数字＝使う火。材料1〜2つ＝1、3つ＝2、4つ以上＝3）。<b>評価</b>で相手の気力を削り、<b>守り</b>で相手の攻めを防ぐ。辛さ＝毎ターンじわじわ評価、弱気＝相手の攻めが弱まる、引く＝カードを引く。<br>勝つたびに新しい料理カードを1枚もらえる（知らないレシピなら覚えられる）。何度でも挑戦できる。</div>
    <div class="p">最高記録：${D.best}人抜き　完全制覇：${D.wins}回</div>
    <div class="btn big grn" data-du="go">⚔ 決闘に挑む</div>${unl('tower') ? '<div class="btn big" data-du="tower" style="margin-top:calc(var(--u)*1.4)">🗼 決闘の塔へ</div>' : ''}<div class="btn" data-du="les" style="display:block;text-align:center;margin-top:calc(var(--u)*1.4)">📘 練習試合（立会人ボルドにルールを教わる）</div><div class="h">デッキ（${D.deck.length}枚・8〜14枚）　タップで出し入れ</div>
    <div class="dcards">${Object.keys(S.known.r).map(Number).sort((a, b) => (D.deck.includes(b) - D.deck.includes(a))).slice(0, 60).map(ri => cardHTML(cardOf(ri), D.deck.includes(ri) ? 'in' : 'out', `data-dk="${ri}"`)).join('')}</div>`;
  modal('料理決闘', html, 'duel');
  bind('[data-dk]', d => { const ri = +d.dk, i = D.deck.indexOf(ri); if (i >= 0) { if (D.deck.length <= 8) return toast('デッキは8枚以上必要'); D.deck.splice(i, 1); } else { if (D.deck.length >= 14) return toast('デッキは14枚まで'); D.deck.push(ri); } dirty = true; openDuelMenu(); });
  bind('[data-du]', d => { if (d.du === 'tower') return towerMenu(); if (d.du === 'les' || !D.lesson) { closeModal(); duelLesson(); return; } if (D.deck.length < 8) return toast('覚えたレシピが8つ以上必要'); closeModal(); startDuel(); });
}
function cardHTML(c, cls = '', attr = '') { const r = REC[c.ri]; return `<div class="dcard ${cls}" ${attr}><div class="dcost">${c.cost}</div>${icHTML(r.icon, U * 12, 'atlas')}<div class="dname">${r.name}${c.tl ? `<b style="color:#ff9a4a"> ＋${c.tl}</b>` : ''}</div><div class="dfx">${cardText(c)}</div></div>`; }
function startDuel() {
  const D = S.duelS; D.runs++;
  duel = {stage:0, hpMax:50 + 10 * rankIdx(), deck:D.deck.slice(), lvl:Math.min(5, D.wins)};
  duel.hp = duel.hpMax; $('duelv').classList.add('show'); tut('duel'); sfx('door'); nextFoe();
}
function nextFoe() {
  $('dplate').innerHTML = '<div class="dpl" style="opacity:.35">🍽<div>審査台</div></div>';
  const f = duel.tower ? towerFoe(duel.floor) : DUEL_FOES[duel.stage], sc = duel.tower ? f.sc : 1 + .15 * duel.lvl;
  duel.foe = {...f, hp:Math.round(f.hp * sc), hpMax:Math.round(f.hp * sc), blk:0, burn:0, weak:0, str:0, pi:0, sc};
  duel.draw = shuffle(duel.deck.map(cardOf)); duel.disc = []; duel.hand = []; duel.blk = 0; duel.weakMe = 0; duel.nextEn = 0; duel.turn = 0; duel.state = 'fight';
  startTurn();
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function drawN(n) { for (let i = 0; i < n; i++) { if (!duel.draw.length) { duel.draw = shuffle(duel.disc); duel.disc = []; } if (!duel.draw.length || duel.hand.length >= 9) break; duel.hand.push(duel.draw.pop()); } }
function intent() { const f = duel.foe, p = f.pat[f.pi % f.pat.length]; return p; }
function intentText(p) { const f = duel.foe; if (p[0] === 'atk') { const v = Math.round((p[1] + f.str) * (f.weak ? .75 : 1) * f.sc); return `⚔ ${v}${p[2] ? '×' + p[2] : ''}`; } return {def:'🛡 守る', buf:'🔥 気合い', wk:'💧 弱らせる'}[p[0]]; }
function startTurn() { duel.turn++; duel.en = 3 + duel.nextEn; duel.nextEn = 0; duel.blk = 0; drawN(5); renderDuel(); }
function playCard(i) {
  const c = duel.hand[i], f = duel.foe; if (!c || c.cost > duel.en || duel.state !== 'fight') return;
  if (duel.les && !lesAllow('play', c)) return;
  duel.en -= c.cost; duel.hand.splice(i, 1); duel.disc.push(c);
  $('dplate').innerHTML = `<div class="dpl">${icHTML(REC[c.ri].icon, U * 34, 'atlas')}<div>${REC[c.ri].name}</div></div>`;
  if (c.dmg) { let d = c.dmg * (duel.weakMe ? .75 : 1) | 0; const b = Math.min(f.blk, d); f.blk -= b; d -= b; f.hp -= d; floatDuel(`-${d}`, 'foe'); }
  if (c.blk) duel.blk += c.blk; if (c.burn) f.burn += c.burn; if (c.weak) f.weak += c.weak; if (c.heal) duel.hp = Math.min(duel.hpMax, duel.hp + c.heal); if (c.en) duel.nextEn += c.en; if (c.draw) drawN(c.draw);
  sfx('pop'); if (f.hp <= 0) return winFoe(); renderDuel();
}
function endTurn() {
  if (duel.state !== 'fight') return; const f = duel.foe;
  if (duel.les && !lesAllow('end')) return;
  duel.disc.push(...duel.hand); duel.hand = [];
  if (f.burn) { f.hp -= f.burn; floatDuel(`🌶${f.burn}`, 'foe'); f.burn--; if (f.hp <= 0) return winFoe(); }
  f.blk = 0; const p = intent(); f.pi++;
  if (p[0] === 'atk') { for (let k = 0; k < (p[2] || 1); k++) { let d = Math.round((p[1] + f.str) * (f.weak ? .75 : 1) * f.sc); const b = Math.min(duel.blk, d); duel.blk -= b; d -= b; duel.hp -= d; if (d) floatDuel(`-${d}`, 'me'); } sfx('break'); }
  else if (p[0] === 'def') f.blk += Math.round(p[1] * f.sc); else if (p[0] === 'buf') f.str += p[1]; else if (p[0] === 'wk') duel.weakMe += p[1];
  if (f.weak) f.weak--; if (duel.weakMe) duel.weakMe--;
  if (duel.hp <= 0) return loseDuel();
  startTurn();
}
function floatDuel(t, who) { const e = document.createElement('div'); e.className = 'sfloat'; e.style.left = who === 'foe' ? '50%' : '50%'; e.style.top = who === 'foe' ? 'calc(var(--u)*50)' : 'calc(var(--u)*140)'; e.textContent = t; $('duelv').appendChild(e); setTimeout(() => e.remove(), 900); }
function winFoe() {
  if (duel.les) return lesWin();
  if (duel.tower) return towerWin();
  duel.state = 'reward'; duel.stage++; const D = S.duelS; D.best = Math.max(D.best, duel.stage); sfx('ok');
  const gold = 80 * duel.stage * (1 + duel.lvl * .3) | 0; S.gold += gold; dirty = true;
  if (duel.stage >= DUEL_FOES.length) { D.wins++; const prize = pick(['moon_extract', 'diamond', 'moonstone', 'truffle']); add(S.inv, prize, 1); S.known.i[prize] = true;
    $('dres').innerHTML = `<div class="tcard"><div class="tth">🏆 完全制覇！</div><div class="ttx">5人すべてに勝った！<br>賞金 +${fmt(gold)}G　賞品：${ingName(prize)}（倉庫へ）<br>次からは相手が少し強くなる（制覇 ${D.wins}回）。</div><div class="btn big" id="dok">戻る</div></div>`;
    $('dok').onclick = closeDuel; return; }
  const pool = REC.map((r, i) => i).filter(i => !SECRET_R.has(i) && !REC[i].ings.some(id => HYBS.has(id)) && !TOWER_RI.has(i) && !TOWN_RI.has(i)), opts = shuffle(pool).slice(0, 3);
  $('dres').innerHTML = `<div class="tcard"><div class="tth">⚔ ${DUEL_FOES[duel.stage - 1].n}に勝った！</div><div class="ttx">賞金 +${fmt(gold)}G<br>デッキに加える料理カードを1枚選ぶ（知らないレシピなら覚えられる）</div>
    <div class="dcards">${opts.map(ri => cardHTML(cardOf(ri), S.known.r[ri] || S.learned[ri] ? '' : 'new', `data-rw="${ri}"`)).join('')}</div>
    <div class="btn" id="drest">カードの代わりに休む（気力を30%回復）</div></div>`;
  $('dres').querySelectorAll('[data-rw]').forEach(el => el.onclick = () => { const ri = +el.dataset.rw; duel.deck.push(ri); if (!S.known.r[ri] && !S.learned[ri]) { S.learned[ri] = true; toast(`レシピ『${REC[ri].name}』を覚えた！`); } $('dres').innerHTML = ''; nextFoe(); });
  $('drest').onclick = () => { duel.hp = Math.min(duel.hpMax, duel.hp + Math.round(duel.hpMax * .3)); $('dres').innerHTML = ''; nextFoe(); };
}
function loseDuel() {
  if (duel.les) { duel.state = 'lost'; $('dres').innerHTML = `<div class="tcard"><div class="tth">気力が尽きた……</div><div class="ttx">練習だから気にするな。もう一度やってみよう。</div><div class="btn big" id="dok">やり直す</div></div>`; $('dok').onclick = () => { $('dres').innerHTML = ''; duelLesson(); }; return; }
  if (duel.tower) { sfx('break'); return towerEnd(true); }
  duel.state = 'lost'; sfx('break');
  $('dres').innerHTML = `<div class="tcard"><div class="tth">気力が尽きた……</div><div class="ttx">${duel.stage}人抜きで終了。<br>デッキを見直して、また挑もう（何度でも挑戦できる）。</div><div class="btn big" id="dok">戻る</div></div>`;
  $('dok').onclick = closeDuel;
}
function closeDuel() { $('duelv').style.background = ''; if ($('dles')) $('dles').remove(); $('dres').innerHTML = ''; $('duelv').classList.remove('show'); duel = null; dirty = true; }
function renderDuel() {
  const f = duel.foe, p = intent();
  $('dtop').innerHTML = `<div class="dfoe">${charHTML(f.k, U * 26)}<div><b>${duel.tower ? `🗼${duel.floor}階` : `${duel.stage + 1}人目`}　${f.n}</b><div class="dhp"><i style="width:${Math.max(0, f.hp / f.hpMax * 100)}%"></i><span>${Math.max(0, f.hp)}/${f.hpMax}</span></div>
    <div class="dst">${f.blk ? `🛡${f.blk} ` : ''}${f.burn ? `🌶${f.burn} ` : ''}${f.weak ? `💧${f.weak} ` : ''}${f.str ? `🔥+${f.str}` : ''}</div><div class="dint">次の手：${intentText(p)}</div></div></div><div class="fx" id="dxx">×</div>`;
  $('dme').innerHTML = `<div class="dhp me"><i style="width:${Math.max(0, duel.hp / duel.hpMax * 100)}%"></i><span>あなたの気力 ${Math.max(0, duel.hp)}/${duel.hpMax}</span></div>
    <div class="dst">${duel.blk ? `🛡守り${duel.blk} ` : ''}${duel.weakMe ? `💧弱気${duel.weakMe} ` : ''}</div><div class="den">${'🔥'.repeat(duel.en)}<span>${'・'.repeat(Math.max(0, 3 - duel.en))}</span>　山札${duel.draw.length}　捨て札${duel.disc.length}</div>`;
  $('dhand').innerHTML = duel.hand.map((c, i) => cardHTML(c, c.cost > duel.en ? 'dim' : '', `data-pc="${i}"`)).join('') + `<div class="btn dend" id="dend">ターン終了</div>`;
  $('dhand').querySelectorAll('[data-pc]').forEach(el => el.onclick = () => playCard(+el.dataset.pc));
  $('dend').onclick = endTurn; $('dxx').onclick = () => { if (confirmQuit()) { if (duel.tower) towerEnd(false); else closeDuel(); } };
  if (duel.les) lesApply();
}
function confirmQuit() { if (duel._q && Date.now() - duel._q < 2000) return true; duel._q = Date.now(); toast('もう一度押すと決闘をやめる'); return false; }

// ====================================================== v0.20: AI original recipes — 試作台 (trial kitchen)
let SAMPLE = null;
(async () => { try { if (window.claude && window.claude.use) SAMPLE = await claude.use('sample'); } catch (e) { SAMPLE = null; } })();
const TRIAL_DAILY = 3, TRIAL_TASTES = 5, TRIAL_SLOTS = 6, TRIAL_ASKS = 4;
const TSTR = ['甘', '辛', '酸', '苦', '旨'];
// v0.48 仕上げ：味付け・盛り付け・ジャンル
const FIN_S = {'なし':[0,0,0,0,0], '塩':[0,0,0,0,1], 'しょうゆ':[0,0,0,0,2], 'みそ':[1,0,0,0,2], '甘辛':[2,1,0,0,1], 'ソース':[1,0,1,0,1], 'スパイス':[0,2,0,1,0], 'ハーブ':[0,0,1,1,0], 'レモン':[0,0,2,0,0], 'ごま':[1,0,0,0,1], 'バター':[1,0,0,0,2], 'はちみつ':[2,0,0,0,0]};
const FIN_P = {'おまかせ':[1, 0], '素朴に':[1, 0], '大皿で豪快に':[1.02, 0], '小鉢で上品に':[1.03, 0], '彩りよく華やかに':[1.05, 1], '屋台風に':[1.01, 0], '重箱に詰めて':[1.04, 1]};
const FIN_G = ['おまかせ', '和', '洋', '中', 'エスニック', 'お菓子', 'パン'];
const GENRE_SUF = {'和':['の煮びたし', 'の照り焼き', 'の炊き合わせ', 'の田楽'], '洋':['のグラタン風', 'のポワレ', 'のキッシュ', 'のテリーヌ'], '中':['の甘酢あん', 'の黒酢炒め', 'の中華蒸し', 'の香味だれ'],
  'エスニック':['のスパイス炒め', 'のココナッツ煮', 'のエスニックサラダ', 'の香草包み'], 'お菓子':['のタルト', 'のプリン', 'のパウンドケーキ', 'のパフェ'], 'パン':['のサンド', 'のフォカッチャ', 'のパイ包み', 'のトースト']};
const trialsLeft = () => { if (!S.trialDay || S.trialDay.d !== gday()) S.trialDay = {d:gday(), n:0}; return TRIAL_DAILY - S.trialDay.n; };
const finOf = f => f || {s:'なし', p:'おまかせ', g:'おまかせ'};
function tasteOf(ids, method, fin) { const t = [...(MTASTE[method] || [0,0,0,0,0])], fs = FIN_S[finOf(fin).s] || FIN_S['なし'];
  ids.forEach(id => ING[INGI[id]].taste.forEach((v, i) => t[i] += v)); fs.forEach((v, i) => t[i] += v); if (finOf(fin).g === 'お菓子') t[0] += 1;
  const k = ids.length > 4 ? .8 * 4 / ids.length + .2 : .8; return t.map(v => Math.min(5, Math.round(v * k))); }
function finBonus(ids, method, fin) { const f = finOf(fin), t = tasteOf(ids, method, fin); let b = 0;
  if (f.s !== 'なし') { const fs = FIN_S[f.s], mi = fs.indexOf(Math.max(...fs)); b += t[mi] <= 4 ? 3 : -2; }
  if (f.g === 'お菓子') b += t[0] >= 3 ? 3 : -3; else if (f.g === '中') b += ['炒める', '蒸す', '揚げる'].includes(method) ? 3 : 0; else if (f.g === '和') b += ['煮る', '生', '炊く', '和える', '焼く'].includes(method) ? 2 : 0;
  else if (f.g === '洋') b += ['焼く', '煮る'].includes(method) ? 2 : 0; else if (f.g === 'エスニック') b += t[1] >= 2 ? 3 : 0; else if (f.g === 'パン') b += ids.some(id => /パン|小麦|生地|皮/.test(ingName(id))) ? 4 : -2;
  if (ids.length >= 5) b -= (ids.length - 4) * 2; return b; }
function gameScore(ids, method, fin) {
  const u = [...new Set(ids)]; let pairSum = 0, pairs = 0;
  for (let a = 0; a < u.length; a++) for (let b = a + 1; b < u.length; b++) { pairs++; pairSum += Math.min(3, REC.filter(r => r.ings.includes(u[a]) && r.ings.includes(u[b])).length); }
  const ps = pairs ? pairSum / (3 * pairs) : .35;
  const rel = REC.filter(r => r.ings.some(x => u.includes(x))), mf = rel.length ? rel.filter(r => r.method === method).length / rel.length : .3;
  const t = tasteOf(ids, method, fin), peak = Math.max(...t), bal = (peak >= 3 ? 1 : peak / 3) * (t.filter(v => v >= 1).length >= 2 ? 1 : .75) * (t[0] >= 3 && t[3] >= 3 ? .8 : 1);
  const q = ids.reduce((a, id) => a + qOf(id), 0) / ids.length;
  return Math.round(Math.max(20, Math.min(98, 28 + 38 * ps + 16 * mf + 12 * bal + 6 * (q - 1) / 2 + (u.length >= 3 ? 3 : 0) + finBonus(ids, method, fin))));
}
let trial = null;
function trialKey() { return trial.method + '|' + trial.slots.slice().sort().join(','); }
function openTrial(pre) {
  if (!unl('airec')) return gateMsg('airec');
  if (!trial || pre) trial = {slots:pre ? pre.ings.slice() : [], method:pre ? pre.method : (cook.method || '煮る'), fin:{s:'なし', p:'おまかせ', g:'おまかせ'}, log:[], score:null, prev:null, focus:null, comment:'材料を選んで、まず味見させてみろ。注文を「ひとこと」で言ってくれてもいい。', busy:false, asks:0, sug:[], ord:''};
  if (!trial.fin) trial.fin = {s:'なし', p:'おまかせ', g:'おまかせ'}; if (trial.asks === undefined) { trial.asks = 0; trial.sug = []; trial.ord = ''; }
  renderTrial();
}
function trialOwned() { return allIngs().filter(x => !x.g && x.n > 0); }
function ownedList(n) { return trialOwned().sort((a, b) => b.n - a.n).slice(0, n || 90).map(x => `${x.id}:${ingName(x.id)}`).join('、'); }
function renderTrial() {
  const T = trial, t = T.slots.length ? tasteOf(T.slots, T.method, T.fin) : [0,0,0,0,0], left = trialsLeft();
  const items = trialOwned().sort((a, b) => (T.sug.includes(b.id) - T.sug.includes(a.id)));
  const fi = TSTR.indexOf(T.focus), F = T.fin, sel = (k, opts) => `<select class="trsel" data-fs="${k}">${opts.map(o => `<option ${F[k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  const html = `<div class="trhead"><span>今日の試作 あと${left}品</span><span>味見 ${T.log.length} / ${TRIAL_TASTES}回</span></div>
    <div class="trorder"><input id="tro" class="trin" maxlength="40" placeholder="ひとことで注文（例：寒い夜に温まる辛いスープ）" value="${(T.ord || '').replace(/"/g, '&quot;')}"><div class="btn blu ${T.busy || T.asks >= TRIAL_ASKS ? 'dis' : ''}" data-ta="order">頼む</div></div>
    <div class="trpot"><div class="soup" style="background:radial-gradient(ellipse at 50% 40%,${T.slots.length ? '#c8502a' : '#2a2018'},${T.slots.length ? '#6a1e14' : '#120c08'} 70%)">${T.slots.map(id => `<i>${ingIc(id, U * 8)}</i>`).join('')}</div></div>
    <div class="slots six">${[0,1,2,3,4,5].map(i => `<div class="slot ${T.slots[i] ? 'fill' : ''}" data-ts="${i}">${T.slots[i] ? ingIc(T.slots[i], U * 11) : '<span style="opacity:.4;font-size:1.6em">+</span>'}</div>`).join('')}</div>
    <div class="seg many">${METHODS.map(m => `<div class="${m === T.method ? 'on' : ''}" data-tm="${m}">${m}</div>`).join('')}</div>
    <div class="trfin"><label>味付け${sel('s', Object.keys(FIN_S))}</label><label>盛り付け${sel('p', Object.keys(FIN_P))}</label><label>ジャンル${sel('g', FIN_G)}</label></div>
    <div class="trchef">${charHTML('cook', U * 20)}<div class="bub">${T.busy ? '<span class="dots">考え中</span>' : T.comment}</div></div>
    <div class="trtaste">${t.map((v, i) => `<div><b>${TSTR[i]}</b>${[0,1,2,3,4].map(k => `<i class="${k < v ? 'on' : ''} ${i === fi && k >= v && T.dir === 'up' ? 'want' : ''} ${i === fi && k < v && k >= v - 1 && T.dir === 'down' ? 'less' : ''}"></i>`).join('')}${i === fi ? `<span>${T.dir === 'down' ? '← 強すぎるらしい' : '← 料理長はここが気になる'}</span>` : ''}</div>`).join('')}${T.focus && fi < 0 ? `<div class="p" style="color:#8ad0c8">料理長は「${T.focus}」が気になるようだ</div>` : ''}</div>
    <div class="trscore"><span>完成度</span><div class="bar"><i style="width:${T.score || 0}%"></i></div><b>${T.score != null ? T.score + '点' : '－'}</b>${T.prev != null && T.score != null ? `<em style="color:${T.score >= T.prev ? '#8ad08a' : '#e07a6a'}">（${T.score >= T.prev ? '+' : ''}${T.score - T.prev}）</em>` : ''}</div>
    <div style="display:flex;gap:${U * 1.5}px"><div class="btn big blu ${T.slots.length && !T.busy && T.log.length < TRIAL_TASTES && left > 0 ? '' : 'dis'}" data-ta="taste" style="flex:1">味見する</div><div class="btn big grn ${T.log.length && !T.busy && left > 0 ? '' : 'dis'}" data-ta="done" style="flex:1">これで完成にする</div></div>
    <div class="btn ${T.busy || T.asks >= TRIAL_ASKS ? 'dis' : ''}" data-ta="sug" style="display:block;text-align:center;margin-top:${U}px">💡 料理長に材料を聞く（あと${Math.max(0, TRIAL_ASKS - T.asks)}回）</div>
    <div class="p">${left > 0 ? '材料は6つまで。味見では食材を使わない。完成にすると、その組み合わせで1皿作る（食材を1組使う）。' : '今日の試作はもう終わり。明日また来い。'}${SAMPLE ? '' : '<br><span style="color:#d8806a">AIにつながっていないので、料理長は短い言葉しか話さない（Claudeの画面で開くと話す）</span>'}</div>
    <div class="h">食材（タップで入れる／入れた食材をタップで出す）${T.sug.length ? '　<span style="color:#e8c060">✦＝料理長のおすすめ</span>' : ''}</div><div class="grid">${items.map(it => { const used = T.slots.filter(x => x === it.id).length; return `<div class="cell ${it.n - used <= 0 ? 'dim' : ''} ${T.sug.includes(it.id) ? 'sug' : ''}" data-ti="${it.id}">${ingIc(it.id, U * 12)}<span class="n">${it.n - used}</span></div>`; }).join('')}</div>`;
  modal('試作台', html, 'trial');
  const inp = $('tro'); if (inp) inp.oninput = () => { T.ord = inp.value.slice(0, 40); };
  $('mbody').querySelectorAll('[data-fs]').forEach(el => el.onchange = () => { if (T.busy) return; T.fin[el.dataset.fs] = el.value; renderTrial(); });
  bind('[data-ts]', d => { if (T.busy) return; T.slots.splice(+d.ts, 1); renderTrial(); });
  bind('[data-ti]', d => { if (T.busy || T.slots.length >= TRIAL_SLOTS) return; const have = haveIng(d.ti, false) - T.slots.filter(x => x === d.ti).length; if (have <= 0) return; T.slots.push(d.ti); T.sug = T.sug.filter(x => x !== d.ti); renderTrial(); });
  bind('[data-tm]', d => { if (T.busy) return; T.method = d.tm; renderTrial(); });
  bind('[data-ta=taste]', () => tasteTrial());
  bind('[data-ta=done]', () => finishTrial());
  bind('[data-ta=order]', () => orderTrial());
  bind('[data-ta=sug]', () => suggestTrial());
}
// ひとことの注文 → 材料・調理法・仕上げを料理長が組み立てる
const KW48 = [[/辛|ピリ|激辛|スパイ|カレー/, {t:1}], [/甘|スイーツ|デザート|お菓子|ケーキ|おやつ/, {t:0, g:'お菓子'}], [/酸|さっぱり|すっぱ|爽やか/, {t:2}], [/苦|大人|ほろ苦/, {t:3}], [/旨|コク|濃厚|がっつり|ボリューム/, {t:4}],
  [/スープ|汁|鍋|煮込|温ま|シチュー/, {m:'煮る'}], [/焼|グリル|香ばし|ステーキ/, {m:'焼く'}], [/揚|フライ|カリ|サク|唐揚/, {m:'揚げる'}], [/蒸/, {m:'蒸す'}], [/ご飯|丼|炊|おにぎり|ピラフ/, {m:'炊く'}], [/炒|チャーハン|ソテー/, {m:'炒める'}],
  [/和え|サラダ|あえ|マリネ/, {m:'和える'}], [/刺身|生|冷た|カルパッチョ/, {m:'生'}], [/パン|サンド|トースト/, {g:'パン'}], [/中華|中国/, {g:'中'}], [/和風|和食|おふくろ/, {g:'和'}], [/洋風|洋食|ビストロ/, {g:'洋'}], [/エスニック|アジア|タイ|インド/, {g:'エスニック'}],
  [/華やか|パーティ|記念|お祝い/, {p:'彩りよく華やかに'}], [/上品|お酒|つまみ/, {p:'小鉢で上品に'}], [/屋台|手軽|片手/, {p:'屋台風に'}], [/肉/, {c:'meat'}], [/魚|海|貝|えび|いか/, {c:'fish'}], [/野菜|ヘルシー|畑/, {c:'veg'}], [/きのこ/, {c:'mush'}], [/果物|フルーツ/, {c:'fruit'}]];
const ingCat48 = id => { const n = ingName(id); if (MEATY.has(id) || /肉|ひき|ベーコン|ハム|ソーセージ|もも|ささみ/.test(n)) return 'meat'; if (FISHY.has(id) || /魚|鮭|鯛|えび|いか|たこ|貝|たら|しらす|明太|かに|まぐろ|さば/.test(n)) return 'fish';
  if (/きのこ|茸|しめじ|えのき|まいたけ|エリンギ|しいたけ/.test(n)) return 'mush'; if (/いちご|りんご|もも|ぶどう|みかん|レモン|キウイ|アボカド|ベリー|果/.test(n)) return 'fruit'; return ING[INGI[id]].src[0] === 'seed' ? 'veg' : 'etc'; };
function orderFallback(txt) {
  const want = {t:[], m:null, g:null, p:null, c:[]}; for (const [re, o] of KW48) if (re.test(txt)) { if (o.t !== undefined) want.t.push(o.t); if (o.m && !want.m) want.m = o.m; if (o.g && !want.g) want.g = o.g; if (o.p && !want.p) want.p = o.p; if (o.c) want.c.push(o.c); }
  const own = trialOwned(), val = id => ING[INGI[id]].value, cheap = id => -Math.log(1 + val(id)) * .6, cat = id => ingCat48(id), co = (a, b) => Math.min(3, REC.filter(r => r.ings.includes(a) && r.ings.includes(b)).length);
  const taken = [], take = id => { if (id && !taken.includes(id)) taken.push(id); };
  const mainC = want.c.length ? want.c : ['meat', 'fish', 'veg'];
  const mains = own.filter(x => mainC.includes(cat(x.id))).map(x => ({id:x.id, s:ING[INGI[x.id]].taste[4] + (want.m && REC.some(r => r.method === want.m && r.ings.includes(x.id)) ? 2 : 0) + cheap(x.id) + Math.random()})).sort((a, b) => b.s - a.s);
  take(mains[0] && mains[0].id); if (want.c.length > 1) take((mains.find(m => cat(m.id) !== cat(taken[0])) || {}).id);
  for (const t of want.t.slice(0, 2)) { const c = own.filter(x => !taken.includes(x.id)).map(x => ({id:x.id, s:ING[INGI[x.id]].taste[t] * 2 + (taken[0] ? co(taken[0], x.id) : 0) + cheap(x.id) + Math.random() * .5})).sort((a, b) => b.s - a.s)[0]; if (c && c.s > 1) take(c.id); }
  while (taken.length < 3) { const c = own.filter(x => !taken.includes(x.id)).map(x => ({id:x.id, s:taken.reduce((a, t) => a + co(t, x.id), 0) * 2 + (cat(x.id) === 'veg' ? 1 : 0) + cheap(x.id) + Math.random()})).sort((a, b) => b.s - a.s)[0]; if (!c) break; take(c.id); }
  const ings = taken;
  const fs = want.t.includes(1) ? 'スパイス' : want.t.includes(0) ? 'はちみつ' : want.t.includes(2) ? 'レモン' : want.t.includes(4) ? 'しょうゆ' : 'なし';
  return {ings, method:want.m || pick(METHODS), s:fs, p:want.p || 'おまかせ', g:want.g || 'おまかせ', comment:want.t.length || want.m || want.c.length ? 'その注文なら、こう組んでみた。まず味見だ。' : 'ふむ……手元の材料で、こんな線でどうだ。'};
}
async function orderTrial() {
  const T = trial, txt = (T.ord || '').trim(); if (T.busy || T.asks >= TRIAL_ASKS) return; if (!txt) return toast('上の欄に、どんな料理がいいかを書いてから「頼む」');
  T.busy = true; T.asks++; renderTrial(); sfx('pop'); let r = null;
  if (SAMPLE) {
    const prompt = `あなたはダークファンタジー世界の食堂「宵闇亭」の料理長。弟子から「${txt}」という注文を受けた。手元にある食材だけで、注文に合う新しい料理を組み立てて。
家庭料理・屋台・菓子・パン・世界の料理（和・洋・中・エスニック）など、レシピサイトにあるような幅広い料理を自由に発想してよい。
手元の食材（id:名前）：${ownedList(90)}
調理法は次から1つ：${METHODS.join('、')}
味付けは次から1つ：${Object.keys(FIN_S).join('、')}
盛り付けは次から1つ：${Object.keys(FIN_P).join('、')}
ジャンルは次から1つ：${FIN_G.join('、')}
ルール：ings は手元の食材の id を2〜6個（同じidを2回まで）。comment は料理長のひとこと40文字以内（どんな料理にしたか）。
JSONだけを返す：{"ings":[""],"method":"","s":"","p":"","g":"","comment":""}`;
    try { r = await SAMPLE.json(prompt, {modelTier:'quick'}); } catch (e) { if (e && e.code === 'not_granted') SAMPLE = null; r = null; }
  }
  const own = new Set(trialOwned().map(x => x.id));
  if (r && Array.isArray(r.ings)) r.ings = r.ings.map(String).filter(id => own.has(id) && INGI[id] !== undefined).slice(0, TRIAL_SLOTS);
  if (!r || !r.ings || r.ings.length < 2) r = Object.assign(orderFallback(txt), r && r.comment ? {comment:r.comment} : {});
  T.slots = r.ings.filter((id, i, a) => a.slice(0, i).filter(x => x === id).length < Math.min(2, haveIng(id, false))).slice(0, TRIAL_SLOTS);
  if (METHODS.includes(r.method)) T.method = r.method; T.fin = {s:FIN_S[r.s] ? r.s : 'なし', p:FIN_P[r.p] ? r.p : 'おまかせ', g:FIN_G.includes(r.g) ? r.g : 'おまかせ'};
  T.comment = String(r.comment || 'こう組んでみた。味見してみろ。').slice(0, 60); T.focus = null; T.sug = []; T.busy = false; dirty = true; S.stat.trOrd = (S.stat.trOrd || 0) + 1;
  if (modalOpen === 'trial') renderTrial();
}
// 足りない材料を料理長が提案
function suggestFallback() {
  const T = trial, own = trialOwned().filter(x => !T.slots.includes(x.id)), base = T.slots.length ? gameScore(T.slots, T.method, T.fin) : 0;
  const cand = shuffle(own.slice()).slice(0, 40).map(x => ({id:x.id, s:gameScore([...T.slots, x.id].slice(-TRIAL_SLOTS), T.method, T.fin)})).sort((a, b) => b.s - a.s);
  const add = cand.slice(0, 2).map(c => c.id), up = cand.length ? cand[0].s - base : 0;
  let rm = null; if (T.slots.length >= 3) { const w = T.slots.map(id => ({id, s:gameScore(T.slots.filter(x => x !== id), T.method, T.fin)})).sort((a, b) => b.s - a.s)[0]; if (w && w.s > base + 2) rm = w.id; }
  return {add, remove:rm, comment:add.length ? (rm ? `${ingName(rm)}は外してもいい。光っている物を足してみろ。` : up > 0 ? '光っている物を足すと、まとまりが出るはずだ。' : '今のままでも悪くない。好みで足してみろ。') : '手元の食材が少ないな。市場で仕入れてこい。'};
}
async function suggestTrial() {
  const T = trial; if (T.busy || T.asks >= TRIAL_ASKS) return; T.busy = true; T.asks++; renderTrial(); sfx('pop'); let r = null;
  if (SAMPLE && T.slots.length) {
    const t = tasteOf(T.slots, T.method, T.fin);
    const prompt = `あなたはダークファンタジー世界の食堂「宵闇亭」の料理長。弟子の試作に、足すと良い材料を手元の食材から選んで教える。
今の試作：材料 ${T.slots.map(ingName).join('、')}／調理法 ${T.method}／味付け ${T.fin.s}／ジャンル ${T.fin.g}／味の強さ 甘${t[0]} 辛${t[1]} 酸${t[2]} 苦${t[3]} 旨${t[4]}
${T.ord ? `弟子の注文：「${T.ord}」` : ''}
手元の食材（id:名前）：${ownedList(90)}
ルール：add は足すと良い食材の id を1〜2個（手元の食材から）。remove は外すと良い食材の id（なければ空文字）。comment は料理長のひとこと40文字以内（理由を短く）。材料は合計6つまで。
JSONだけを返す：{"add":[""],"remove":"","comment":""}`;
    try { r = await SAMPLE.json(prompt, {modelTier:'quick'}); } catch (e) { r = null; }
  }
  const own = new Set(trialOwned().map(x => x.id));
  if (r && Array.isArray(r.add)) r.add = r.add.map(String).filter(id => own.has(id)).slice(0, 2);
  if (!r || !r.add || !r.add.length) r = suggestFallback();
  T.sug = r.add; T.comment = String(r.comment || '光っている物を試してみろ。').slice(0, 60); if (r.remove && T.slots.includes(r.remove) && !T.comment.includes(ingName(r.remove))) T.comment += `（${ingName(r.remove)}は外してもいい）`;
  T.busy = false; dirty = true; if (modalOpen === 'trial') renderTrial();
}
function fallbackTaste(ids, method, gs, fin) {
  const t = tasteOf(ids, method, fin), peak = Math.max(...t), mi = t.indexOf(peak);
  if (ids.length >= 6 && gs < 70) return {comment:'材料が多すぎて味がぶつかる。主役を決めて減らせ。', focus:'なし', dir:'none', score:gs};
  if (peak < 2) return {comment:'味がぼやけている。主役になる味を決めろ。味付けで締めてもいい。', focus:TSTR[mi === -1 ? 4 : mi], dir:'up', score:gs};
  if (t[4] < 2 && peak >= 3) return {comment:'悪くないが後味が軽い。コクのある物を足してみろ。', focus:'旨', dir:'up', score:gs};
  if (t[0] >= 4 && t[2] < 1) return {comment:'甘さが重たい。酸味で引き締めろ。', focus:'酸', dir:'up', score:gs};
  if (t[1] >= 5) return {comment:'辛すぎて舌が焼ける。少し抑えろ。', focus:'辛', dir:'down', score:gs};
  return {comment:gs >= 75 ? 'うむ、まとまっている。あとは盛り付けだ。' : '方向は合っている。調理法かジャンルを見直してみろ。', focus:gs >= 75 ? 'なし' : '香り', dir:'none', score:gs};
}
async function tasteTrial() {
  const T = trial; if (!T.slots.length || T.busy || T.log.length >= TRIAL_TASTES || trialsLeft() <= 0) return;
  const k = trialKey(), rk = RKEY[k];
  if (rk != null) { T.comment = `それは「${S.known.r[rk] || S.learned[rk] ? REC[rk].name : '昔からある料理'}」だ。オリジナルにはならん。何か変えてみろ。`; T.focus = null; sfx('tick'); return renderTrial(); }
  const ex = S.creative['c:' + k]; if (ex && ex.ai) { T.comment = `それはもう図鑑にある「${ex.name}」だ。別の組み合わせを試せ。`; return renderTrial(); }
  const gs = gameScore(T.slots, T.method, T.fin), t = tasteOf(T.slots, T.method, T.fin);
  T.busy = true; renderTrial(); sfx('pop');
  let r = null;
  if (SAMPLE) {
    const hist = T.log.slice(-4).map((l, i) => `${i + 1}回目：${l.ings.map(ingName).join('・')}／${l.method}／${l.score}点／「${l.comment}」`).join('\n');
    const prompt = `あなたはダークファンタジー世界の食堂「宵闇亭」の料理長。厳しいが温かい職人で、短く的確に話す。弟子（プレイヤー）が新しい料理を試作したので味見して評価する。
和・洋・中・エスニック、家庭料理、屋台、菓子、パンなど、レシピサイトにあるような幅広い料理の知識で自由に評価してよい。
今回の試作：材料 ${T.slots.map(ingName).join('、')}／調理法 ${T.method}／味付け ${T.fin.s}／盛り付け ${T.fin.p}／ジャンル ${T.fin.g}
${T.ord ? `弟子の注文：「${T.ord}」（注文に合っているかも見る）` : ''}
味の強さ（0〜5）：甘${t[0]} 辛${t[1]} 酸${t[2]} 苦${t[3]} 旨${t[4]}
ゲーム上の相性の目安：${gs}点（材料の組み合わせの実績と味のバランスから計算）
${hist ? 'これまでの試作：\n' + hist : '初めての味見。'}
ルール：
- comment：料理長のひとこと。日本語45文字以内。具体的な改善の方向（「コクのある物を足せ」「酸味で締めろ」「焼いて香ばしさを」「味付けを変えろ」など）を1つだけ。材料名をそのまま答えとして言わない。前回より良くなったら認める。
- focus：一番気にしている点。"甘","辛","酸","苦","旨","香り","食感","なし" のどれか。
- dir：focus の味を "up"（足りない）/"down"（強すぎる）/"none"。
- score：料理としての出来 0〜100 の整数。目安の点数を参考に±20の範囲で。
JSONだけを返す：{"comment":"","focus":"","dir":"","score":0}`;
    try { r = await SAMPLE.json(prompt, {modelTier:'quick'}); } catch (e) { if (e && e.code === 'not_granted') SAMPLE = null; r = null; }
  }
  if (!r || typeof r.score !== 'number') r = fallbackTaste(T.slots, T.method, gs, T.fin);
  const ai = Math.max(0, Math.min(100, Math.round(r.score))), score = Math.round(.55 * ai + .45 * gs);
  T.prev = T.score; T.score = score; T.comment = String(r.comment || '').slice(0, 60) || '……ふむ。'; T.focus = r.focus && r.focus !== 'なし' ? String(r.focus) : null; T.dir = r.dir || 'none';
  T.log.push({ings:T.slots.slice(), method:T.method, fin:{...T.fin}, score, comment:T.comment});
  T.busy = false; sfx(T.prev != null && score > T.prev ? 'ok' : 'tick'); dirty = true;
  if (modalOpen === 'trial') renderTrial();
}
async function finishTrial() {
  const T = trial; if (!T.log.length || T.busy || trialsLeft() <= 0) return;
  const best = T.log.reduce((a, b) => b.score > a.score ? b : a, T.log[0]);
  if (best.ings.some(id => haveIng(id, false) < best.ings.filter(x => x === id).length)) return toast('一番出来の良かった組み合わせの食材が足りない。');
  T.final = best; T.busy = true; renderNaming(null);
  const fin = finOf(best.fin);
  let r = null;
  if (SAMPLE) {
    const prompt = `ダークファンタジー世界の食堂「宵闇亭」で、新しいオリジナル料理が完成した。料理名の案を3つと、短い説明を1つ考えて。
材料：${best.ings.map(ingName).join('、')}／調理法：${best.method}／味付け：${fin.s}／盛り付け：${fin.p}／ジャンル：${fin.g}／完成度：${best.score}点${T.ord ? `／注文：「${T.ord}」` : ''}
条件：names は日本語14文字以内。家庭料理・洋食・中華・エスニック・菓子・パンなど料理のジャンルらしい呼び方（〜の照り焼き、〜のキッシュ、〜の甘酢あん、〜のタルト など）を自由に使い、世界観に合い味が想像できる名前を3つ（雰囲気を変える）。実在の商標・人名は使わない。desc は日本語45文字以内、味と見た目が浮かぶ少し詩的な文。
JSONだけを返す：{"names":["","",""],"desc":""}`;
    try { r = await SAMPLE.json(prompt, {modelTier:'quick'}); } catch (e) { r = null; }
  }
  const u = [...new Set(best.ings)], g = fin.g !== 'おまかせ' ? fin.g : null, a0 = ingName(u[0]), a1 = u[1] ? ingName(u[1]) : null;
  const sufs = g ? GENRE_SUF[g] : null, base = a0 + (a1 ? 'と' + a1 : '') + 'の' + MSUF[best.method];
  if (!r || !Array.isArray(r.names) || r.names.length < 1) r = {names:g ? [a0 + sufs[0], '宵闇の' + a0 + sufs[1], (a1 || a0) + sufs[2]] : ['宵闇の' + base, '霧月の' + a0 + (MSUF[best.method] || '料理'), '黒猫亭の' + base],
    desc:`${u.map(ingName).slice(0, 3).join('と')}を${best.method === '生' ? 'そのまま' : best.method.replace('く', 'いて').replace('る', 'て')}${fin.s !== 'なし' ? fin.s + '味で' : ''}仕上げた、宵闇亭だけの一皿。`};
  T.cands = r.names.slice(0, 3).map(n => String(n).slice(0, 16)); T.name = T.cands[0]; T.desc = String(r.desc || '').slice(0, 60); T.busy = false;
  renderNaming();
}
function renderNaming() {
  const T = trial, b = T.final;
  const html = `<div class="trname">${charHTML('cook', U * 14)}<div><div class="p" style="margin:0">${b.method}：${b.ings.map(ingName).join('・')}</div><div style="color:#e8c060;font-weight:800">完成度 ${b.score}点</div></div></div>
    ${T.busy || !T.cands ? '<div class="p" style="text-align:center"><span class="dots">料理長が名前を考えている</span></div>' : `
    <div class="h">料理長の案</div>${T.cands.map((n, i) => `<div class="row ${T.name === n ? 'sel' : ''}" data-nc="${i}"><div class="t"><b>${T.name === n ? '● ' : '○ '}${n}</b></div></div>`).join('')}
    <div class="h">自分で書く</div><input id="trn" class="trin" maxlength="16" placeholder="料理名（16文字まで）" value="${T.cands.includes(T.name) ? '' : T.name.replace(/"/g, '&quot;')}">
    <div class="h">説明</div><textarea id="trd" class="trin" maxlength="60" rows="2">${T.desc}</textarea>
    <div class="p">名前と説明は、客の食いつき（★）として売値に少し影響する。</div>
    <div class="btn big" data-na="ok" style="background:linear-gradient(180deg,#c8902a,#7a4e16)">この名前で完成！</div>`}`;
  modal('料理に名前をつける', html, 'naming');
  bind('[data-nc]', d => { T.name = T.cands[+d.nc]; const i = $('trn'); if (i) i.value = ''; T.desc = ($('trd') || {}).value || T.desc; renderNaming(); });
  const inp = $('trn'); if (inp) inp.oninput = () => { if (inp.value.trim()) T.name = inp.value.trim().slice(0, 16); };
  bind('[data-na=ok]', () => { const ta = $('trd'); if (ta) T.desc = ta.value.trim().slice(0, 60); if (inp && inp.value.trim()) T.name = inp.value.trim().slice(0, 16); judgeName(); });
}
async function judgeName() {
  const T = trial, b = T.final; if (T.busy) return; T.busy = true;
  const el = document.querySelector('[data-na=ok]'); if (el) { el.classList.add('dis'); el.textContent = '客の反応を見ている……'; }
  let r = null;
  if (SAMPLE) {
    const prompt = `食堂の新メニューの名前と説明が、客の興味をどれだけ引くかを判定して。料理：${b.ings.map(ingName).join('、')}を${b.method}料理（${finOf(b.fin).g}・${finOf(b.fin).s}味・${finOf(b.fin).p}）。
名前：「${T.name}」 説明：「${T.desc}」
★1〜5（味が想像できるか、魅力、世界観、読みやすさ）。comment は料理長のひとこと20文字以内。不適切な言葉が含まれていたら stars は1。
JSONだけを返す：{"stars":3,"comment":""}`;
    try { r = await SAMPLE.json(prompt, {modelTier:'quick'}); } catch (e) { r = null; }
  }
  if (!r || typeof r.stars !== 'number') r = {stars:T.name.length >= 4 && T.name.length <= 14 ? (T.desc.length >= 12 ? 4 : 3) : 2, comment:'悪くない名前だ。'};
  const stars = Math.max(1, Math.min(5, Math.round(r.stars)));
  const key = 'c:' + b.method + '|' + b.ings.slice().sort().join(',');
  for (const id of b.ings) takeIng(id, false, 1);
  const base = Math.round(b.ings.reduce((s, id) => s + ING[INGI[id]].value, 0) * 1.3 + 4);
  if (!S.aiRecs) S.aiRecs = [];
  const no = S.aiRecs.length + 1;
  S.creative[key] = {name:T.name, ings:b.ings.slice(), method:b.method, value:Math.round(base * (1 + b.score / 200) * (1 + (stars - 3) * .06) * ((FIN_P[finOf(b.fin).p] || [1])[0])), desc:T.desc, ai:true, score:b.score, stars, no, day:gday(), sold:0, fin:{...finOf(b.fin)}}; S.stat.aiMade = (S.stat.aiMade || 0) + 1;
  if (!S.aiRecs.includes(key)) S.aiRecs.push(key);
  const q = b.ings.reduce((a, id) => a + qOf(id), 0) / b.ings.length; blendDQ(key, 1, q); add(S.dish, key, 1); S.mast[key] = (S.mast[key] || 0) + 1;
  S.trialDay.n++; trial = null; dirty = true; closeModal(); sfx('ok');
  const c = S.creative[key];
  $('celebrate').innerHTML = `<div class="cel"><div class="rays"></div><div class="ribbon">オリジナルレシピ誕生！</div>${dishIcHTML(key, U * 46)}<div class="cname">${c.name}</div><div class="cstar">完成度 ${c.score}点　${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
    <div class="trchef">${charHTML('cook', U * 16)}<div class="bub">${String(r.comment || 'お前だけの一皿だ。胸を張って店に出せ。').slice(0, 30)}</div></div>
    <div class="cdesc">${c.desc}</div><div class="cstamp">オリジナルレシピ図鑑 No.${String(no).padStart(3, '0')} に登録　価値 ${fmt(c.value)}G</div><div class="btn big" id="celok">わかった</div></div>`;
  $('celebrate').classList.add('show'); $('celok').onclick = () => { $('celebrate').classList.remove('show'); $('celebrate').innerHTML = ''; };
}
function openAiRecs() {
  const list = (S.aiRecs || []).filter(k => S.creative[k] && S.creative[k].ai);
  const html = `<div class="p">試作台で考えた、あなただけの料理の記録。完成度と客の食いつき（★）が高いほど高く売れる。</div>
    <div class="btn big blu" data-a="trial">🧪 試作台へ（今日あと${trialsLeft()}品）</div>
    ${list.map((k, i) => { const c = S.creative[k]; return `<div class="orc"><div class="ono">No.${String(c.no || i + 1).padStart(3, '0')}</div>${dishIcHTML(k, U * 15)}<div class="t"><b>${c.name}</b><span class="g">完成度 ${c.score}点　${'★'.repeat(c.stars || 3)}${'☆'.repeat(5 - (c.stars || 3))}</span><span>${c.desc || ''}</span><span class="s">${c.method}：${c.ings.map(ingName).join('・')}　価値 ${fmt(c.value)}G　売れた数 ${c.sold || 0}</span></div></div>`; }).join('')}
    <div class="orc dim"><div class="ono">No.${String(list.length + 1).padStart(3, '0')}</div><div class="t"><b>？？？</b><span>試作台で新しい組み合わせを試そう</span></div></div>`;
  modal('オリジナルレシピ図鑑', ooHTML() + html, 'airec');
  bind('[data-a=trial]', () => openTrial()); ooBind(openAiRecs);
}
function aiButtonHTML(key) {
  if (!unl('airec') || key[0] !== 'c') return '';
  const c = S.creative[key]; if (!c) return '';
  if (c.ai) return `<div class="p" style="color:#8ad0c8">オリジナルレシピ「${c.name}」（完成度 ${c.score}点）</div>`;
  return `<div class="btn big blu" data-ai="${key}">🧪 試作台でオリジナルレシピに仕上げる</div>`;
}
function aiNameDish(key) { const c = S.creative[key]; if (!c) return; closeModal(); openTrial({ings:c.ings, method:c.method}); }

// ====================================================== v0.18: business hours / daily result / night & sleep / manual idle
const OPEN_H = 540, CLOSE_H = 1080;   // 9:00 - 18:00
const isOpenNow = () => !!S.shopOpen;
const canOpen = () => { const h = hmNow(); return !S.shopOpen && S.openedDay !== gday() && h >= 360 && h < CLOSE_H; };
function openShop(auto) {
  if (!canOpen()) return false; S.shopOpen = true; S.openedDay = gday(); S.day_ = newDay_(); dirty = true;
  if (!simulating) { toast(auto ? `🏮 ${S.staff.clerk ? '店員' : '看板娘の黒猫'}が店を開けた（18時まで営業）` : '🏮 開店！ 宵闇亭、本日も営業中（18時まで）', 3500); sfx('door'); chips(); }
  return true;
}
const isDark = () => { const h = hmNow(); return h >= 1140 || h < 300; };
function newDay_() { return {d:gday(), cust:0, buy:0, earned:0, extra:0, dish:{}, regs:[], critic:null, orders:0, rep0:S.rep}; }
function dayTrack() { if (!S.day_) S.day_ = newDay_(); return S.day_; }
function hoursStep(vis) {
  const h = hmNow();
  if (canOpen() && h >= (S.staff.clerk ? OPEN_H : 600)) openShop(true);
  if (S.shopOpen && (h >= CLOSE_H || h < 360)) closeShop(vis);
}
function closeShop(vis) {
  if (!S.shopOpen) return; { S.shopOpen = false; const r = dayTrack(); r.rep1 = S.rep; r.day = gday(); S.lastDay = r;
    if (!S.dayLog) S.dayLog = []; S.dayLog.unshift({d:r.day, buy:r.buy, earned:r.earned, cust:r.cust}); S.dayLog = S.dayLog.slice(0, 14);
    if (vis && !simulating) showDayResult(r); else { if (!rep_.days) rep_.days = 0; rep_.days++; }
    S.day_ = newDay_(); }
}
function showDayResult(r) {
  const best = Object.entries(r.dish).sort((a, b) => b[1] - a[1])[0];
  const dr = (r.rep1 - r.rep0), per = r.buy ? Math.round(r.earned / r.buy) : 0;
  const prev = (S.dayLog || [])[1];
  popStory(`<div class="tunl">${monthName()} ${dayInMonth()}日 ― 閉店</div><div class="tth">📖 本日の営業結果</div>
    <div class="ledger">
      <div><span>来店したお客</span><b>${r.cust}人</b></div>
      <div><span>買ってくれたお客</span><b>${r.buy}人</b></div>
      <div><span>売上</span><b class="g">${fmt(r.earned)}G</b></div>
      <div><span>客単価</span><b>${fmt(per)}G</b></div>
      ${r.extra ? `<div><span>追加注文</span><b>${r.extra}件</b></div>` : ''}
      ${r.orders ? `<div><span>依頼の達成</span><b>${r.orders}件</b></div>` : ''}
      <div><span>評判</span><b style="color:${dr >= 0 ? '#8ad08a' : '#e07a6a'}">${dr >= 0 ? '+' : ''}${dr.toFixed(1)}</b></div>
      <div><span>評論家</span><b>${r.critic ? '★'.repeat(r.critic.stars) + '☆'.repeat(5 - r.critic.stars) : '来店なし'}</b></div>
      ${r.regs.length ? `<div><span>常連客</span><b>${[...new Set(r.regs)].join('・')}</b></div>` : ''}
    </div>
    ${best ? `<div class="tst" style="margin-top:4px">${dishIcHTML(best[0], U * 12)}<div class="ttx">一番人気：<b>${dishInfo(best[0]).name}</b>（${best[1]}皿）</div></div>` : ''}
    ${prev ? `<div class="ttx" style="color:var(--sub);font-size:calc(var(--f)*2.8)">前日の売上 ${fmt(prev.earned)}G</div>` : ''}
    <div class="trw">夜は危ないので外出は控えめに。<br>ベッドで眠る（朝までとばす）／地下迷宮に潜る／明日の仕込み（料理）をしよう。${S.fac.bar ? '<br>2階の酒場は夜も営業中。' : ''}</div>`, () => tut('hours'));
  sfx('ok');
}
// night overlay for outdoor scenes
function drawNight() {
  if (!['outside', 'farm', 'hill', 'wilds', 'port', 'desert', 'tea', 'capital', 'isle', 'guild', 'mranch', 'oldtown'].includes(scene) && !(isBio() && scene !== 'b_moon')) return;
  const h = hmNow(), lerp = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
  let day = 0, warm = 0, dark = 0;
  if (h >= 420 && h < 960) day = 1; else if (h >= 300 && h < 420) { day = lerp(h, 300, 420); warm = 1 - Math.abs(h - 380) / 80; } else if (h >= 960 && h < 1080) { day = 1 - lerp(h, 960, 1080); warm = lerp(h, 960, 1040); }
  if (h >= 1080) dark = Math.min(.55, lerp(h, 1080, 1260) * .55); else if (h < 300) dark = .55; else if (h < 420) dark = .55 * (1 - lerp(h, 300, 420));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (day > 0) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,236,205,${.2 * day})`; ctx.fillRect(0, 0, 144, LH);
    const g = ctx.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, `rgba(255,240,200,${.16 * day})`); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 144, 160); }
  if (warm > 0) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(255,${h < 600 ? 150 : 110},70,${.45 * warm})`; ctx.fillRect(0, 0, 144, LH); }
  if (dark > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(6,8,30,${dark})`; ctx.fillRect(0, 0, 144, LH); }
  ctx.restore(); drawTownGlow();
}
// bed & sleep
let sleeping = false;
function openBed() {
  const h = hmNow();
  if (h >= 360 && h < 1080) return toast('まだ明るい。眠るのは夜（18時以降）にしよう。');
  modal('ベッド', `<div class="p">朝6時まで眠る（時間をとばす）。<br>眠っている間も、料理人の仕込み・加工器具・酒場・宿屋は動き続ける。地下迷宮の体力と気力も全回復する。</div><div class="btn big grn" data-a="sleep">🌙 朝まで眠る</div>`, 'bed');
  bind('[data-a=sleep]', () => { closeModal(); sleepUntilMorning(false); });
}
function sleepUntilMorning(forced) {
  if (sleeping) return; if (S.nightOpen) closeNight(true); sleeping = true;
  const h = hmNow(), toMorning = (h >= 360 ? 1440 - h + 360 : 360 - h);
  $('fade').style.opacity = 1;
  setTimeout(() => {
    const g0 = S.gold; rep_ = {}; simulating = true; let left = toMorning;
    while (left > 0) { const d = Math.min(2, left); step(d, false); left -= d; }
    simulating = false; const r = rep_; r.gold = S.gold - g0;
    const M = mineState(); M.hp = M.hpMax; M.st = M.stMax;
    if (scene === 'mine' && FL && FL.dg) { const r_ = dgReturn(); FL = null; M.trip = {}; M.cl = 0; dgSt().cur = null; scene = r_[0]; }
    if (TOWNC[scene]) { const [ix, iy] = TOWNC[scene].innPos; player.x = ix; player.y = iy; player.path = []; S.pos = {scene, x:ix, y:iy}; }
    else { if (scene !== 'interior') { if (scene === 'mine') { FL = null; M.trip = {}; } scene = 'interior'; }
    player.x = 109; player.y = 108; player.path = []; S.pos = {scene:'interior', x:109, y:108}; } buildActors(); updCam(true); hud(); chips();
    $('fade').style.opacity = 0; sleeping = false; dirty = true; lastLogic = Date.now();
    const parts = [];
    if (r.branch) parts.push(`支店の売上 ${fmt(r.branch)}G が届いた`); if (r.night) parts.push(`裏営業：深夜の客 ${r.night.buy}人に ${fmt(r.night.earned)}G 売った`); if (r.town) parts.push(`町から届いた：${r.town}`); if (r.spent) parts.push(`材料と種の仕入れに ${fmt(r.spent)}G 使った`); if (r.cooked) parts.push(`料理人が仕込みで ${r.cooked}皿 作った`); if (r.proc) parts.push(`加工器具で ${r.proc}個 できた`);
    if (r.bar) parts.push(`酒場の売上 ${fmt(r.bar)}G`); if (r.inn) parts.push(`宿屋の売上 ${fmt(r.inn)}G`); if (r.harvested) parts.push(`農夫が ${r.harvested}個 収穫した`);
    popStory(`<div class="tth">${forced ? '😵 眠気に負けて倒れてしまった……' : '🌅 おはよう！'}</div><div class="ttx">${monthName()} ${dayInMonth()}日の朝。天気：${wx().i}${wx().n}${wx().d ? '（' + wx().d + '）' : ''}<br>${parts.join('<br>') || '静かな夜だった。'}${forced ? '<br><span style="color:#e07a6a">夜ふかしは禁物。2時を過ぎると倒れてしまう。</span>' : ''}${morningTodo()}</div><div class="trw">棚に料理を並べたら「🔔開店する」。開けないと10時に自動で開店する。</div>`, () => tut('sleep'));
  }, 400);
}
// v0.55：朝の報告の「今日のやること」（やることの一覧から上位＋魚市の目玉＋今日の予定）
function morningTodo() {
  let L = []; try { L = todoList(); } catch (e) {}
  const extra = [];
  if (unl('fishing')) { const st = fmStock(), top = st.it.slice().sort((a, b) => (b.rare || 0) - (a.rare || 0) || ING[INGI[b.id]].value - ING[INGI[a.id]].value)[0]; if (top) extra.push(`🐟 今日の魚市（6〜10時）の目玉：${ingName(top.id)}${top.rare ? '（珍しい！）' : ''}　ほか${st.it.length - 1}品`); }
  try { const ev = curEvent && curEvent(); if (ev) extra.push(`🎉 行事：${ev.n}`); } catch (e) {}
  const items = L.slice(0, 6).map(x => `${x.i} ${x.t}`).concat(extra);
  return items.length ? `<div style="margin-top:.6em;padding-top:.5em;border-top:1px solid rgba(255,255,255,.12)"><b>📋 今日のやること</b>${L.length > 6 ? `（ほか${L.length - 6}件は画面上の📋）` : ''}<br>${items.join('<br>')}</div>` : '';
}
// manual idle (放置)
function openIdle() {
  modal('放置する', `<div class="p">放置を始めると、ゲームを閉じている間も時間が進み、従業員が働く（最大8時間分）。<br>店は朝に開いて18時に閉まり、夜は仕込みや酒場・宿屋が動く。<br><b>放置ボタンを押さずに閉じた場合は、時間は止まったまま。</b></div><div class="btn big grn" data-a="idle">💤 放置を始める</div>`, 'idle');
  bind('[data-a=idle]', () => { closeModal(); startIdle(); });
}
function startIdle() {
  S.afk = {on:true, t:Date.now()}; saveNow(true);
  $('idlev').classList.add('show'); $('idlev').innerHTML = `<div class="tcard"><div class="tth">💤 放置中</div><div class="ttx">このままゲームを閉じても大丈夫。<br>従業員たちが店を回している（最大8時間分）。<br><span id="idlet" style="color:var(--sub)"></span></div><div class="btn big" id="idleback">戻る（結果を見る）</div></div>`;
  $('idleback').onclick = () => endIdle();
}
function endIdle() {
  if (!S.afk || !S.afk.on) return; const sec = (Date.now() - S.afk.t) / 1000; S.afk.on = false;
  $('idlev').classList.remove('show'); const r = simulate(sec); lastLogic = Date.now(); dirty = true; saveNow(true);
  if (r.sec >= 30) showReport(r); else toast('放置をやめた。');
}
function idleTick() { if (S.afk && S.afk.on) { const e = $('idlet'); if (e) { const s = Math.floor((Date.now() - S.afk.t) / 1000); e.textContent = `経過 ${Math.floor(s / 60)}分${s % 60}秒`; } return true; } return false; }

// ===== v0.22: 宵闇亭の秘密（日記）・魔物料理・裏営業・町への投資
const MON_ING = new Set(ING.filter(g => g.src[0] === 'mine' || g.src[0] === 'dungeon').map(g => g.id));
const NIGHT_ING = new Set(ING.filter(g => g.src[0] === 'night').map(g => g.id));
const isMonDish = key => { const d = dishInfo(key); return d.ings.some(id => MON_ING.has(id)); };
const isNightDish = key => { const d = dishInfo(key); return d.ings.some(id => NIGHT_ING.has(id)); };
const monTag = key => key && isMonDish(key) ? '<span class="mtag">魔</span>' : '';
const MPART = {boar:['boar_liver', .35], bat:['bat_wing', .5], slime:['slime_core', .35], lizard:['fire_gland', .4], slimei:['frost_core', .4],
  icebeast:['ice_marrow', .4], darkbird:['dark_egg', .45], shade:['shade_ink', .45], slimed:['void_core', .35], meibeast:['mei_heart', .3]};
function butcherMul() { if (typeof gearFx !== 'function') return 1; const f = gearFx(), st = wStats(); return (st.bu || 1) * (f.butcher ? 1.5 : 1) * (f.butcher2 ? 2 : 1) * (f.martha ? 2 : 1); }
function monPartDrop(m) {
  if (!unl('monster')) return; const p = MPART[m.k]; if (!p || Math.random() > p[1] * monDropMul(m.k) * butcherMul()) return;
  giveBag('i', p[0], false, 1); tripAdd(p[0], 1); S.known.i[p[0]] = true; S.stat.monparts = (S.stat.monparts || 0) + 1;
  floatAt(m.x, m.y - 16, ingName(p[0]) + ' +1', 'info'); tut('monster_part');
}

// ---------- 日記（宵闇亭の秘密）
const STORY = [
  {t:'開店の日', h:'日記を開いたところで見つかる', c:() => true,
   x:'今日、オルグと二人で店を開いた。<br>名前は「宵闇亭」。夜の生まれの彼が、いちばん落ち着く時間だから。<br>客は三人。全員、パン屋のおかみさんの親戚だった。<br><span class="sig">― マルタ</span>'},
  {t:'井戸の下の町', h:'地下迷宮のB3あたり', c:s => s.mine && s.mine.max >= 3,
   x:'裏の古井戸の下には、昔の町の跡がある。<br>オルグはそこから来た。角を帽子で隠して、焦げたスープの鍋を抱えて。<br>「人間の料理を覚えたい」と言うから、まずは焦がさないことから教えた。'},
  {t:'浮きに結んだ献立', h:'釣りをしていると、何かが糸にかかるかも', c:s => (s.stat.fished || 0) >= (s.story.f0 || 0) + 3,
   x:'（古い釣りの浮きに、油紙でくるんだ紙が結んであった）<br>オルグは魚の目利きがまるでだめ。今日もフグを「丸くてかわいい」と買ってきた。<br>今夜の献立：アジの塩焼き。フグは池に放した。'},
  {t:'魔物の肉', h:'地下迷宮のB10あたり', c:s => s.mine && s.mine.max >= 10,
   x:'今日はオルグが先生。<br>地下の魔物の肉は、臭みを抜けば驚くほど旨い。肝はにんにくと強火で。<br>町の人には「魔物の料理」とは言わずに出したら、おかわりが来た。<br>（日記の端に料理の覚え書きがある）', learn:'猪レバーのにんにく炒め'},
  {t:'森の花', h:'森と浜で採集していると', c:s => (s.stat.foraged || 0) >= (s.story.g0 || 0) + 4,
   x:'（森の大きな木のうろに、ページがはさまっていた）<br>森で摘んだ花束を渡したら、オルグはそれを食べた。<br>地下では花は贈り物じゃなくて、ごちそうなんだそうだ。<br>次からは野菜で花束を作ることにする。'},
  {t:'魔女の記憶', h:'魔女のミラと話してみよう', c:s => s.story.mira,
   x:'「マルタ？……ええ、知ってるわ。あなたの前に、あの店をやっていた人」<br>「旦那さんのオルグは角のある料理人でね。ある冬、角を見られて町の人に追われて、井戸の下へ帰ってしまったの」<br>「それからマルタは、夜になると井戸から来る客にだけ料理を出してた。旦那さんの知らせを待ってたのね」<br>ミラは古いページを1枚くれた。'},
  {t:'もう一つの営業', h:'地下迷宮のB20あたり', c:s => s.mine && s.mine.max >= 20,
   x:'オルグがいなくなって三か月。<br>夜中に、角や羽のある客が裏口をたたくようになった。全員「オルグの親戚だ」と言う。全員だ。<br>お代はお金じゃなくて、月の雫や幽霊の涙。たぶん、彼が送ってくれている。'},
  {t:'夜ふけの客の忘れ物', h:'裏営業で深夜の客をもてなす', c:s => (s.stat.nightserved || 0) >= 1,
   x:'（深夜の客が帰ったあと、席にページが残されていた）<br>「この味、マルタの店のだ」と、帽子の客が言った。<br>「オルグは元気にしてる。地下の町で食堂をやってる。焦がしてばかりだけどな」<br>泣きながら笑った。'},
  {t:'地下の町の入口', h:'地下迷宮のB30あたり', c:s => s.mine && s.mine.max >= 30,
   x:'地下の町の入口まで来た。ここから先は、人の足で一月かかるらしい。<br>弁当を多めに持ってきてよかった。魔物たちも、おにぎりの匂いには弱い。'},
  {t:'町の人たち', h:'町に3つ投資する', c:s => Object.keys(s.town || {}).length >= 3,
   x:'町の人たちが、少しずつ夜の客に慣れてきた。<br>パン屋の娘が、羽のある子に焼きたてを分けていた。<br>オルグが帰ってきても、もう誰も追い出したりしない町になってほしい。'},
  {t:'旅立ち', h:'地下迷宮のB40あたり', c:s => s.mine && s.mine.max >= 40,
   x:'私は降りる。オルグの食堂へ。<br>宵闇亭は、いつかこの日記を見つけた人にまかせる。鍋と、かまどと、夜の客をよろしく。<br>最後に、二人でいちばん最初に作った晩ごはんの作り方を書いておく。――続きは、下で会えたら。'},
  {t:'ふたりの食堂', h:'地下迷宮のB50', c:s => s.mine && s.mine.max >= 50, final:1,
   x:'迷宮のいちばん奥に、湯気の立つ小さな食堂があった。<br>角のある大男が鍋を焦がし、白髪のおばあさんがそれを笑っている。<br><br>「あら、あなたが新しい店主さん？　宵闇亭はまだやってる？」<br>「座って。ちょうど晩ごはんができたところ。……オルグ、焦げてるわよ」<br><br>三人で食べた晩ごはんは、少し焦げていて、とてもおいしかった。<br>帰りぎわ、マルタは日記の最後のページを手渡した。<br><span class="sig">― 宵闇亭の物語　おわり ―</span>', learn:'ふたりの晩ごはん'},
];
function storyState() { if (!S.story) S.story = {n:0, f0:S.stat.fished || 0, g0:S.stat.foraged || 0}; return S.story; }
function storyTick() {
  if (!unl('story')) return; const st = storyState(), p = STORY[st.n]; if (!p || tutOpen) return;
  if (st.n === 7 && !unl('night')) return; if (st.n === 9 && !unl('town')) return;
  if (!p.c(S)) return;
  st.n++; if (st.n === 3) st.g0 = S.stat.foraged || 0; if (st.n === 2) st.f0 = S.stat.fished || 0;
  dirty = true; sfx('ok'); let extra = '';
  if (p.learn) { const ri = REC.findIndex(r => r.name === p.learn); if (ri >= 0 && !S.learned[ri] && !S.known.r[ri]) { learnRecipes([ri]); extra = `<div class="p" style="color:#e8b858;margin-top:4px">📖 レシピ「${p.learn}」を覚えた</div>`; } }
  if (p.final) { S.title = '宵闇亭の二代目'; S.rep = Math.min(100, S.rep + 10); extra += '<div class="p" style="color:#e8b858">称号「宵闇亭の二代目」を手に入れた。評判 +10</div>'; }
  const nx = STORY[st.n];
  popStory(`<div class="tunl">📔 日記のページを見つけた（${st.n}/${STORY.length}）</div><div class="tth">${p.t}</div><div class="ttx diary">${p.x}</div>${extra}${nx ? `<div class="p" style="color:var(--sub);margin-top:4px">次のページの手がかり：${nx.h}</div>` : ''}`);
}
function diaryHTML() {
  const st = storyState();
  let h = `<div class="p">先代の店主マルタの日記。${st.n}/${STORY.length}ページ。</div>`;
  STORY.forEach((p, i) => { if (i < st.n) h += `<div class="row" data-pg="${i}"><div class="calev">📔</div><div class="t"><b>${i + 1}. ${p.t}</b><span>タップで読む</span></div></div>`;
    else if (i === st.n) h += `<div class="row" style="opacity:.7"><div class="calev">❔</div><div class="t"><b>${i + 1}. ？？？</b><span>手がかり：${p.h}</span></div></div>`; });
  return h;
}
function bindDiary() { bind('[data-pg]', d => { const p = STORY[+d.pg]; popStory(`<div class="tth">📔 ${p.t}</div><div class="ttx diary">${p.x}</div>`); }); }

// ---------- 裏営業（深夜の客）
const NIGHT_KINDS = [{k:'hood', n:'亡霊の旅人'}, {k:'demon', n:'魔族の紳士'}, {k:'witch', n:'夜の魔女'}, {k:'knight', n:'首なし騎士'}, {k:'noble', n:'吸血の貴婦人'}];
const nightHours = () => { const h = hmNow(); return h >= 1260 || h < 110; };
const canNight = () => unl('night') && !S.nightOpen && !S.shopOpen && nightHours() && S.nightDay !== bday();
function openNight() {
  if (!canNight()) return;
  S.nightOpen = true; S.nightDay = bday(); S.night_ = {cust:0, buy:0, earned:0, items:{}}; S.tm.night = 3; dirty = true; sfx('door');
  toast('🌙 裏営業を始めた。深夜2時まで、人ではない客がやってくる。', 4000); tut('night_open'); chips();
}
function closeNight(vis) {
  if (!S.nightOpen) return; S.nightOpen = false; const r = S.night_ || {cust:0, buy:0, earned:0, items:{}}; dirty = true;
  if (!vis || simulating) { rep_.night = r; return; }
  const it = Object.entries(r.items).map(([id, n]) => `${ingIc(id, U * 7)}${ingName(id)}×${n}`).join('　') || 'なし';
  popStory(`<div class="tunl">🌙 裏営業 ― 閉店</div><div class="tth">深夜の営業結果</div><div class="ledger"><div><span>来た客</span><b>${r.cust}人</b></div><div><span>食べていった客</span><b>${r.buy}人</b></div><div><span>売上</span><b class="g">${fmt(r.earned)}G</b></div></div><div class="p" style="margin-top:4px">置いていった物：${it}</div>`);
}
function nightInterval() { return 11 / ((outfitOn('witch') ? 1.1 : 1) * (1 + .2 * townN('lamp') + (S.town && S.town.tower ? .25 : 0)) * (1 + S.rep / 200)); }
function nightStep(dt, vis) {
  if (!S.nightOpen) return;
  if (!nightHours()) return closeNight(vis);
  S.tm.night = (S.tm.night == null ? 3 : S.tm.night) - dt;
  while (S.tm.night <= 0) {
    S.tm.night += nightInterval() * rnd(.6, 1.4);
    const avail = []; for (let i = 0; i < shelfCount(); i++) if (S.shelf[i].n > 0 && !S.shelf[i].draft) avail.push(i);
    for (const k in S.dish) if (S.dish[k] > 0) avail.push('d:' + k);
    const r = S.night_; r.cust++;
    const nk = pick(NIGHT_KINDS);
    if (!avail.length) { if (vis) toast(`🌙 ${nk.n}が来たが、棚に料理がなくて帰っていった。`, 2500); continue; }
    const i = wpick(avail.map(i => { const k = typeof i === 'string' ? i.slice(2) : S.shelf[i].key, t = dishTaste(k); return {i, w: 1 + (isMonDish(k) ? 3 : 0) + (isNightDish(k) ? 4 : 0) + t[4] * .3 + t[3] * .3}; })).i;
    const fromSt = typeof i === 'string', s = fromSt ? {key:i.slice(2), g:false, n:S.dish[i.slice(2)], price:Math.round(dval(i.slice(2), false) * 1.2)} : S.shelf[i];
    const mon = isMonDish(s.key), nd = isNightDish(s.key), v = dval(s.key, s.g) * (1.6 + (mon ? .5 : 0) + (nd ? .6 : 0));
    const buy = s.price <= v * 1.5;
    if (fromSt) s.price = Math.round(v * .85);
    if (vis) spawnCustVis({slot:fromSt ? 0 : i, buy, re:buy ? (s.price <= v * .9 ? 'cheap' : 'fair') : 'no', price:s.price, kind:nk.k, ghost:1});
    if (!buy) continue;
    rivalTrack(s.key, s.price); if (fromSt) add(S.dish, s.key, -1); else s.n--; S.gold += s.price; r.buy++; r.earned += s.price; S.stat.sold++; S.stat.earned += s.price; S.stat.nightserved = (S.stat.nightserved || 0) + 1;
    if (mon) S.stat.monsold = (S.stat.monsold || 0) + 1;
    rep_.earned = (rep_.earned || 0) + s.price;
    if (Math.random() < .25 + (mon ? .3 : 0) + (nd ? .35 : 0)) {
      const deep = (S.mine && S.mine.max) || 0;
      const id = wpick([{id:'ghost_tear', w:4}, {id:'moon_dew', w:3}, {id:'spirit_flower', w:deep >= 10 ? 2 : .6}, {id:'hades_herb', w:deep >= 25 ? 1.2 : .2}]).id;
      add(S.inv, id, 1); S.known.i[id] = true; r.items[id] = (r.items[id] || 0) + 1; legRoll(.02, 'meifu_zakuro', '深夜の客が、赤黒い果実を置いていった。');
      if (vis) toast(`🌙 ${nk.n}が<b>${ingName(id)}</b>を置いていった`, 2500);
    }
    if (!fromSt && s.n <= 0) s.n = 0;
  }
}

// ---------- 町への投資
const TOWN = [
  {id:'lamp', n:'街灯を増やす', c:400, d:'通りの街灯を増やす。裏営業の客が20%増え、夜の通りが明るくなる。'},
  {id:'flower', n:'花壇をつくる', c:700, d:'店の前に花壇。評判が上がりやすくなる（+8%）。'},
  {id:'paving', n:'石畳を直す', c:1200, d:'歩きやすい通りに。客が来る間隔が短くなる（客+6%）。'},
  {id:'bakery', n:'パン屋を呼ぶ', c:2000, d:'町はずれにパン屋ができる。毎朝、小麦粉とバターが2つずつ届く。'},
  {id:'brewery', n:'酒蔵を呼ぶ', c:3200, d:'丘の上に酒蔵ができる。毎朝、醤油・みそ・酒が1つずつ届く。'},
  {id:'festival', n:'広場を飾りつける', c:4000, d:'広場に旗と飾り。週末の行事の間（金〜日曜）、客+20%。'},
  {id:'tower', n:'時計塔を建てる', c:12000, d:'町のどこからでも見える時計塔。客+10%、裏営業の客+25%、評判が上がりやすくなる（+10%）。ほかの6つが必要。'},
];
const townN = k => S.town && S.town[k] ? 1 : 0;
const townLv = () => Object.keys(S.town || {}).length;
const townCustMul = () => (1 + .06 * townN('paving')) * (1 + .1 * townN('tower')) * (townN('festival') && curEvent() ? 1.2 : 1);
const townRepMul = () => (outfitOn('kimono') ? 1.05 : 1) * (1 + .08 * townN('flower')) * (1 + .1 * townN('tower'));
function townMorning() {
  if (!S.town) return; const bd = bday(); if (S.townDay === bd) return; S.townDay = bd;
  const got = [];
  if (S.town.bakery) { add(S.inv, 'flour', 2); add(S.inv, 'butter', 2); got.push('小麦粉×2・バター×2'); }
  if (S.town.brewery) { add(S.inv, 'soysauce', 1); add(S.inv, 'miso', 1); add(S.inv, 'sake', 1); got.push('醤油・みそ・酒×1'); }
  if (got.length) { if (simulating) rep_.town = got.join('、'); else toast('🏘 町から届いた：' + got.join('、'), 3500); }
}
function openTown() {
  if (!unl('town')) return gateMsg('town');
  tut('town_board');
  const lv = townLv();
  let h = `<div class="p">町の発展計画。お金を出して町を育てると、客が増え、通りの景色も変わっていく。<br>町の発展度：<b>${'◆'.repeat(lv)}${'◇'.repeat(TOWN.length - lv)}</b></div>`;
  for (const t of TOWN) {
    const own = townN(t.id), lock = t.id === 'tower' && townLv() < 6;
    h += `<div class="row"><div class="t"><b>${t.n}</b><span>${t.d}</span></div>${own ? '<div class="btn off">完成</div>' : `<div class="btn ${lock || S.gold < t.c ? 'off' : 'grn'}" data-tw="${t.id}">${lock ? '🔒' : fmt(t.c) + 'G'}</div>`}</div>`;
  }
  modal('町の発展計画', h, 'town');
  bind('[data-tw]', d => { const t = TOWN.find(x => x.id === d.tw); if (townN(t.id) || S.gold < t.c || (t.id === 'tower' && townLv() < 6)) return;
    S.gold -= t.c; if (!S.town) S.town = {}; S.town[t.id] = gday(); dirty = true; sfx('ok'); S.townDay = bday();
    popStory(`<div class="tunl">🏘 町が少し変わった</div><div class="tth">${t.n}</div><div class="ttx">${t.d}${t.id === 'tower' ? '<br><br>時計塔の鐘が鳴った。霧月通りのどこからでも見える。' : ''}</div>`);
    openTown(); });
}
function drawTown() {
  if (!S.town) return; const T = S.town, night = isDark();
  const lampAt = (x, y) => { ctx.fillStyle = '#1a1210'; ctx.fillRect(x, y - 11, 1, 11); ctx.fillRect(x - 1, y, 3, 1); ctx.fillStyle = '#2a1e16'; ctx.fillRect(x - 1, y - 14, 3, 3); ctx.fillStyle = night ? '#ffe08a' : '#c8a868'; ctx.fillRect(x, y - 13, 1, 1); };
  if (T.lamp) [[100, 198], [56, 240], [88, 240], [24, 160]].forEach(([x, y]) => lampAt(x, y));
  if (T.flower) [[44, 121], [90, 121]].forEach(([x, y]) => { ctx.fillStyle = '#3a2416'; ctx.fillRect(x, y, 11, 3); ctx.fillStyle = '#2c4a22'; ctx.fillRect(x, y - 2, 11, 2);
    ['#d84a6a', '#e8c040', '#c8a0f0', '#e87040'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x + 1 + i * 3, y - 3 + (i % 2), 1, 1); }); });
  if (T.paving) { ctx.fillStyle = 'rgba(200,190,170,.12)'; for (let i = 0; i < 9; i++) ctx.fillRect(52 + (i * 13) % 40, 132 + i * 11, 4, 1); }
  const house = (x, y, w, h, roof, win, lit) => { ctx.fillStyle = '#0a080c'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = '#3a2e36'; ctx.fillRect(x, y, w, h); ctx.fillStyle = roof;
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 1 + i, y - 1 - i, w + 2 - i * 2, 1); ctx.fillStyle = '#4a3c44'; ctx.fillRect(x, y, w, 1);
    win.forEach(([wx, wy]) => { ctx.fillStyle = lit ? '#ffc870' : '#7a6a5a'; ctx.fillRect(x + wx, y + wy, 2, 2); }); };
  if (T.bakery) { house(6, 48, 16, 9, '#7a3a2a', [[3, 3], [10, 3]], night); ctx.fillStyle = '#2a2026'; ctx.fillRect(17, 40, 2, 5);
    ctx.fillStyle = '#e8c070'; ctx.fillRect(12, 54, 4, 2); if ((tNow * 2 | 0) % 2) { ctx.fillStyle = 'rgba(220,220,230,.45)'; ctx.fillRect(17 + (tNow * 3 | 0) % 2, 36, 1, 3); } }
  if (T.brewery) { house(108, 47, 20, 10, '#3a4a6a', [[3, 3], [15, 3]], night); ctx.fillStyle = '#8a5a30'; ctx.fillRect(116, 51, 4, 6); ctx.fillStyle = '#c8a050'; ctx.fillRect(116, 53, 4, 1); }
  if (T.festival) { for (let i = 0; i < 12; i++) { ctx.fillStyle = ['#c84a3a', '#e8c040', '#4a8ac8', '#7ac86a'][i % 4]; const x = 46 + i * 4.4, y = 128 + Math.round(Math.sin(i / 11 * Math.PI) * 3); ctx.fillRect(x | 0, y, 3, 1); ctx.fillRect((x | 0) + 1, y + 1, 1, 1); } }
  if (T.tower) { ctx.fillStyle = '#0a080c'; ctx.fillRect(132, 44, 9, 16); ctx.fillStyle = '#4a4050'; ctx.fillRect(133, 45, 7, 15); ctx.fillStyle = '#5a5060'; ctx.fillRect(133, 45, 1, 15);
    ctx.fillStyle = '#2a2430'; ctx.fillRect(131, 42, 11, 3); ctx.fillStyle = night ? '#ffc870' : '#8a7a6a'; ctx.fillRect(136, 49, 1, 2); ctx.fillRect(136, 55, 1, 2);
    const on = .6 + .4 * Math.sin(tNow * 2); ctx.fillStyle = `rgba(255,224,138,${on})`; ctx.fillRect(135, 38, 3, 4); }
  // town sign in the plaza
  ctx.fillStyle = '#3a2416'; ctx.fillRect(95, 296, 1, 9); ctx.fillRect(103, 296, 1, 9); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(92, 292, 15, 7); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(93, 293, 13, 1);
  ctx.fillStyle = '#e8d8b0'; for (let i = 0; i < Math.min(7, townLv()); i++) ctx.fillRect(94 + i * 2, 296, 1, 1);
}
function drawTownGlow() {
  if (scene !== 'outside' || !isDark()) return; const pts = [];
  if (townN('lamp')) pts.push([100, 185], [56, 227], [88, 227], [24, 147]);
  if (townN('tower')) pts.push([136, 40]);
  if (townN('bakery')) pts.push([14, 52]); if (townN('brewery')) pts.push([118, 51]);
  if (!pts.length) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, OFF - Math.round(camY)); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y] of pts) { const g = ctx.createRadialGradient(x, y, 0, x, y, 14); g.addColorStop(0, 'rgba(255,200,110,.28)'); g.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = g; ctx.fillRect(x - 14, y - 14, 28, 28); }
  ctx.restore();
}

// ===== v0.23: お金の使い道（福引き・宝くじ・魔族とのサイコロ・行商人の競り・支店・食材の相場・修行の旅・衣装）
const monthKey = () => Math.floor(gday() / 7);
// ---------- 衣装
const OUTFITS = [
  {id:'apron', n:'店主のエプロン', c:0, d:'いつもの格好'},
  {id:'waiter', n:'給仕の燕尾服', c:5000, d:'客が少し高めの値段でも買う（+2%）', pal:{'#5a2420':'#1a1a1e', '#5a4a3a':'#1e1e26', '#3a3a44':'#e8e0d0'}},
  {id:'witch', n:'魔女のローブ', c:8000, d:'裏営業の客 +10%', pal:{'#5a2420':'#3a1a5a', '#5a4a3a':'#4a2a6a', '#3a3a44':'#2a1a3a'}},
  {id:'knight', n:'騎士の礼装', c:12000, d:'迷宮で受けるダメージ -5%', pal:{'#5a2420':'#a8b0c0', '#5a4a3a':'#7a8090', '#3a3a44':'#3a4a7a'}},
  {id:'kimono', n:'東方の着物', c:15000, d:'評判が上がりやすい（+5%）', pal:{'#5a2420':'#1a1a1a', '#5a4a3a':'#8a2a3a', '#3a3a44':'#e8c860'}},
  {id:'gown', n:'夜会の装い', c:30000, d:'評論家の評価が少し上がる', pal:{'#5a2420':'#e8c860', '#5a4a3a':'#1a2a5a', '#3a3a44':'#c8a040'}},
  {id:'happi', n:'福の法被', c:-1, src:'福引きの金賞でだけ手に入る', d:'福引きで当たりが出やすい', pal:{'#5a2420':'#e8e0d0', '#5a4a3a':'#c83a2a', '#3a3a44':'#e8c860'}},
  {id:'tower', n:'塔の覇者の外套', c:-1, src:'決闘の塔の交換所でだけ手に入る', d:'決闘の塔で気力 +10', pal:{'#5a2420':'#2a1a3a', '#5a4a3a':'#9a6ae8', '#3a3a44':'#e8c050'}},
  {id:'royal', n:'王の衣', c:-1, src:'行商人の競りでだけ手に入る', d:'料理の価値 +3%', pal:{'#5a2420':'#e8c040', '#5a4a3a':'#6a1a2a', '#3a3a44':'#e8d8a0'}},
];
const UNIFORMS = [
  {id:'std', n:'いつもの服', c:0, d:'料理人は白い帽子、店員は赤いベスト'},
  {id:'black', n:'黒の制服', c:6000, d:'客足 +3%', cook:{'#3a3a44':'#141418'}, clerk:{'#5a1e1a':'#18181c', '#d8d0c0':'#f0f0f0'}},
  {id:'white', n:'白の料理服', c:10000, d:'料理人の速さ +5%', cook:{'#3a3a44':'#e0ddd4', '#24201e':'#3a3a44'}, clerk:{'#5a1e1a':'#e8e0d0'}},
  {id:'gold', n:'金ボタンの制服', c:25000, d:'客単価 +3%', cook:{'#3a3a44':'#2a1a4a', '#c8c0b0':'#e8c860', '#b8b0a0':'#c8a040'}, clerk:{'#5a1e1a':'#2a1a4a', '#d8d0c0':'#e8c860'}},
];
const outfitOn = id => (S.outfit || 'apron') === id, uniOn = id => (S.uniform || 'std') === id;
const outfitValMul = () => (outfitOn('waiter') ? 1.02 : 1) * (outfitOn('royal') ? 1.03 : 1) * (uniOn('gold') ? 1.03 : 1);
const tintCache = {};
function tintedChar(k) {
  let pal = null;
  if (k === 'player') { const o = OUTFITS.find(x => x.id === (S.outfit || 'apron')); pal = o && o.pal; }
  else if (k === 'cook' || k === 'clerk') { const u = UNIFORMS.find(x => x.id === (S.uniform || 'std')); pal = u && u[k]; }
  if (!pal || !IMG.chars) return null;
  const key = k + JSON.stringify(pal); if (tintCache[key]) return tintCache[key];
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 18; const c = cv.getContext('2d');
  c.drawImage(IMG.chars, CH[k] * 16, 0, 16, 18, 0, 0, 16, 18);
  const d = c.getImageData(0, 0, 16, 18);
  const P = {}; for (const f in pal) { const t = pal[f]; P[f] = [parseInt(t.slice(1, 3), 16), parseInt(t.slice(3, 5), 16), parseInt(t.slice(5, 7), 16)]; }
  const K = Object.keys(P).map(f => ({f, r:parseInt(f.slice(1, 3), 16), g:parseInt(f.slice(3, 5), 16), b:parseInt(f.slice(5, 7), 16)}));
  for (let i = 0; i < d.data.length; i += 4) { if (!d.data[i + 3]) continue; const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2]; let best = null, bd = 30;
    for (const k of K) { const dd = Math.abs(k.r - r) + Math.abs(k.g - g) + Math.abs(k.b - b); if (dd < bd) { bd = dd; best = k; } }
    if (best) { const m = (r + g + b + 1) / (best.r + best.g + best.b + 1), t = P[best.f]; d.data[i] = Math.min(255, t[0] * m); d.data[i + 1] = Math.min(255, t[1] * m); d.data[i + 2] = Math.min(255, t[2] * m); } }
  c.putImageData(d, 0, 0); tintCache[key] = cv; return cv;
}
function openOutfit() {
  if (!S.outfits) S.outfits = {apron:1}; if (!S.unis) S.unis = {std:1}; tut('outfit');
  let html = `<div class="p">店主の衣装と、従業員の制服。着ると見た目が変わり、少しだけ効果もある。</div>
    <div class="seg">${[['floor', '床'], ['cloth', 'テーブル'], ['light', '照明'], ['deco', '飾り'], ['outfit', '衣装']].map(([k, n]) => `<div class="${decTab === k ? 'on' : ''}" data-dt="${k}">${n}</div>`).join('')}</div><div class="h">店主の衣装</div>`;
  const prev = (k, pal) => { const cv = pal ? tintedChar(k) : null; return `<div style="width:${U * 12}px;height:${U * 13}px;display:flex;align-items:center;justify-content:center">${cv ? `<img src="${cv.toDataURL()}" style="width:${U * 10}px;image-rendering:pixelated">` : charHTML(k, U * 12)}</div>`; };
  for (const o of OUTFITS) { const own = S.outfits[o.id];
    const sv = S.outfit; S.outfit = o.id; const pv = prev('player', o.pal); S.outfit = sv;
    html += `<div class="row">${pv}<div class="t"><b>${o.n}</b><span>${o.d}${o.c < 0 && !own ? '<br>' + o.src : ''}</span></div>${own ? `<div class="btn ${outfitOn(o.id) ? 'grn' : ''}" data-of="${o.id}">${outfitOn(o.id) ? '着ている' : '着る'}</div>` : o.c < 0 ? '<div class="btn dis">非売品</div>' : `<div class="btn ${S.gold >= o.c ? '' : 'dis'}" data-ob="${o.id}">買う<br>${fmt(o.c)}G</div>`}</div>`; }
  html += '<div class="h">従業員の制服</div>';
  for (const u of UNIFORMS) { const own = S.unis[u.id];
    const sv = S.uniform; S.uniform = u.id; const pv = prev('cook', u.cook) + prev('clerk', u.clerk); S.uniform = sv;
    html += `<div class="row"><div style="display:flex">${pv}</div><div class="t"><b>${u.n}</b><span>${u.d}</span></div>${own ? `<div class="btn ${uniOn(u.id) ? 'grn' : ''}" data-uf="${u.id}">${uniOn(u.id) ? '着ている' : '着せる'}</div>` : `<div class="btn ${S.gold >= u.c ? '' : 'dis'}" data-ub="${u.id}">買う<br>${fmt(u.c)}G</div>`}</div>`; }
  modal('内装', html, 'decor');
  bind('[data-dt]', d => { decTab = d.dt; openDecor(); });
  bind('[data-ob]', d => { const o = OUTFITS.find(x => x.id === d.ob); if (S.gold < o.c) return; S.gold -= o.c; S.outfits[o.id] = 1; S.outfit = o.id; sfx('ok'); dirty = true; openOutfit(); });
  bind('[data-of]', d => { S.outfit = d.of; dirty = true; openOutfit(); });
  bind('[data-ub]', d => { const u = UNIFORMS.find(x => x.id === d.ub); if (S.gold < u.c) return; S.gold -= u.c; S.unis[u.id] = 1; S.uniform = u.id; sfx('ok'); dirty = true; openOutfit(); });
  bind('[data-uf]', d => { S.uniform = d.uf; dirty = true; openOutfit(); });
}

// ---------- 福引きと週の宝くじ
const FUKU = [
  {c:'白', col:'#e8e8e8', w:50, n:'残念賞', give:() => { add(S.inv, pick(['flour', 'sugar', 'salt']), 2); return '小麦粉や砂糖など ×2'; }},
  {c:'緑', col:'#5ac85a', w:25, n:'4等', give:() => { const id = pick(['saffron', 'vanilla', 'truffle', 'spice']); add(S.inv, id, 2); S.known.i[id] = true; return `${ingName(id)} ×2`; }},
  {c:'青', col:'#4a8ae8', w:13, n:'3等', give:() => { const w = pick(WARES.slice(0, 2)); if (!S.wares) S.wares = {}; S.wares[w.id] = (S.wares[w.id] || 0) + 1; return `${w.name}（棚に置く器）`; }},
  {c:'赤', col:'#e84a3a', w:8, n:'2等', give:() => { S.gold += 2000; return '2,000G'; }},
  {c:'金', col:'#ffd860', w:4, n:'1等', give:() => { if (!S.outfits) S.outfits = {apron:1}; const first = !S.outfits.happi; S.outfits.happi = 1; S.gold += 8000; return '8,000G' + (first ? '＋限定衣装「福の法被」' : ''); }},
];
function fukuRoll() { const w = FUKU.map((x, i) => ({x, w:x.w * (outfitOn('happi') && i >= 2 ? 1.25 : 1)})); return wpick(w).x; }
function openFuku() {
  if (!unl('lottery')) return gateMsg('lottery');
  tut('lottery'); const L = S.lot && S.lot.m === monthKey() ? S.lot.n : 0;
  const html = `<div class="tst">${charHTML('beard', U * 16)}<div><div class="tth">福引きと宝くじの露店</div><div class="ttx" style="font-size:calc(var(--f)*2.9)">「さあさあ、運だめし！ 金の玉が出たら大当たりだよ」</div></div></div>
    <div class="h">🎊 福引き（1回 500G）</div><div class="p">${FUKU.map(f => `<span style="color:${f.col}">●</span>${f.n}：${f.c === '白' ? '小麦粉や砂糖' : f.c === '緑' ? '珍しい香辛料など×2' : f.c === '青' ? '棚に置く器' : f.c === '赤' ? '2,000G' : '8,000G＋限定衣装'}`).join('<br>')}</div>
    <div style="display:flex;gap:4px"><div class="btn big grn ${S.gold >= 500 ? '' : 'dis'}" data-fk="1" style="flex:1">1回引く</div><div class="btn big ${S.gold >= 4800 ? '' : 'dis'}" data-fk="10" style="flex:1">10回 4,800G</div></div>
    <div class="h">🎫 週の宝くじ（1枚 500G・1週10枚まで）</div><div class="p">毎週日曜の夜（週の終わり）に当選発表。1等 100,000G（1/1000）・2等 20,000G（1/200）・3等 3,000G（1/25）・4等 500G（1/6）<br>今週の券：<b>${L}枚</b>${S.lotLast ? `<br>先週の結果：${S.lotLast}` : ''}</div>
    <div class="btn big ${L < 10 && S.gold >= 500 ? '' : 'dis'}" data-lt="1">宝くじを1枚買う</div>`;
  modal('福引きと宝くじ', html, 'fuku');
  bind('[data-fk]', d => { const n = +d.fk, c = n === 10 ? 4800 : 500; if (S.gold < c) return; S.gold -= c; S.stat.fuku = (S.stat.fuku || 0) + n;
    const res = []; for (let i = 0; i < n; i++) { const f = fukuRoll(); res.push({f, t:f.give()}); }
    sfx(res.some(r => r.f.c === '金' || r.f.c === '赤') ? 'ok' : 'pop'); dirty = true;
    const best = res.slice().sort((a, b) => FUKU.indexOf(b.f) - FUKU.indexOf(a.f))[0];
    popStory(`<div class="tth">🎊 ガラガラ…ポン！</div><div style="font-size:calc(var(--f)*7);text-align:center;letter-spacing:2px">${res.map(r => `<span style="color:${r.f.col}">●</span>`).join('')}</div><div class="ttx" style="text-align:center"><b style="color:${best.f.col}">${best.f.n}</b>${best.f.c === '金' ? ' 大当たり！' : ''}</div><div class="p">${res.filter(r => r.f.c !== '白').map(r => `${r.f.n}：${r.t}`).join('<br>') || '残念賞ばかり……（小麦粉や砂糖をもらった）'}</div>`, () => openFuku());
  });
  bind('[data-lt]', () => { if (S.gold < 500) return; if (!S.lot || S.lot.m !== monthKey()) S.lot = {m:monthKey(), n:0}; if (S.lot.n >= 10) return; S.gold -= 500; S.lot.n++; dirty = true; sfx('coin'); openFuku(); });
}
function lotteryStep() {
  if (!S.lot || S.lot.m === monthKey()) return;
  let win = 0; const hits = [];
  for (let i = 0; i < S.lot.n; i++) { const r = Math.random(); const p = r < .001 ? 100000 : r < .006 ? 20000 : r < .046 ? 3000 : r < .213 ? 500 : 0; if (p) { win += p; hits.push(p); } }
  S.gold += win; S.lotLast = win ? `${S.lot.n}枚中 ${hits.length}枚当たり（${fmt(win)}G）` : `${S.lot.n}枚、すべてはずれ`;
  news(`<div class="tth">🎫 週の宝くじ 当選発表</div><div class="ttx">${S.lotLast}${hits.includes(100000) ? '<br><b style="color:#ffd860">1等 100,000G！ 大当たり！</b>' : ''}</div>`);
  S.lot = null; dirty = true;
}

// ---------- 魔族とのサイコロ（丁半）
const DICE_F = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
function openDice(bet) {
  if (!unl('dice')) return gateMsg('dice');
  if (!S.nightOpen) return toast('魔族の客がいるのは裏営業のあいだだけ。');
  tut('dice'); if (!S.diceN || S.diceN.d !== bday()) S.diceN = {d:bday(), n:0, net:0};
  const left = 10 - S.diceN.n, b = bet || openDice.bet || 500; openDice.bet = b;
  const html = `<div class="tst">${charHTML('demon', U * 18)}<div><div class="tth">魔族の紳士 グラム</div><div class="ttx" style="font-size:calc(var(--f)*2.9)">「店主、ひと勝負どうだ。サイコロ2つの合計が偶数なら<b>丁</b>、奇数なら<b>半</b>。当たれば賭け金の倍だ」</div></div></div>
    <div class="p">賭け金：<b>${fmt(b)}G</b>　今夜の残り ${left}回　今夜の収支 ${S.diceN.net >= 0 ? '+' : ''}${fmt(S.diceN.net)}G</div>
    <div style="display:flex;gap:3px;margin-bottom:4px">${[100, 500, 2000, 10000].map(v => `<div class="btn ${b === v ? 'grn' : ''}" data-bet="${v}" style="flex:1">${fmt(v)}</div>`).join('')}</div>
    <div style="display:flex;gap:4px"><div class="btn big ${left > 0 && S.gold >= b ? 'grn' : 'dis'}" data-dc="0" style="flex:1">丁（偶数）</div><div class="btn big ${left > 0 && S.gold >= b ? 'blu' : 'dis'}" data-dc="1" style="flex:1">半（奇数）</div></div>
    <div class="p" style="color:var(--sub)">負けると賭け金はなくなる。1晩10回まで。</div>`;
  modal('魔族とのサイコロ', html, 'dice');
  bind('[data-bet]', d => openDice(+d.bet));
  bind('[data-dc]', d => { if (S.diceN.n >= 10 || S.gold < b) return; const a = 1 + Math.floor(Math.random() * 6), c = 1 + Math.floor(Math.random() * 6), odd = (a + c) % 2, win = odd === +d.dc;
    S.diceN.n++; if (win) { S.gold += b; S.diceN.net += b; S.stat.diceWin = (S.stat.diceWin || 0) + 1; sfx('ok'); } else { S.gold -= b; S.diceN.net -= b; sfx('break'); } dirty = true;
    popStory(`<div class="tth">🎲 ${win ? '勝ち！' : '負け……'}</div><div style="font-size:calc(var(--f)*11);text-align:center">${DICE_F[a - 1]} ${DICE_F[c - 1]}</div><div class="ttx" style="text-align:center">${a + c}で${odd ? '半' : '丁'}。${win ? `+${fmt(b)}G` : `-${fmt(b)}G`}<br>グラム「${win ? pick(['ほう、やるな', 'ふむ、運のいい店主だ', '今夜はあんたの夜か']) : pick(['くくく、いただいた', 'もう一勝負いくか？', '夜は長いぞ、店主'])}」</div>`, () => openDice(b)); });
}

// ---------- 行商人の競り（毎週土曜）
const AUC_LOTS = [
  {k:'ing', id:'phoenix_egg', n:3, v:2400, d:'不死鳥の卵 ×3'}, {k:'ing', id:'meikemono', n:4, v:1800, d:'冥獣の霜降り肉 ×4'}, {k:'outfit', id:'royal', v:20000, d:'限定衣装「王の衣」'},
  {k:'ware', id:'w3', n:2, v:9000, d:'星の器 ×2'}, {k:'ing', id:'caviar', n:6, v:3000, d:'キャビア ×6'}, {k:'gold', n:3, v:6000, d:'金色の食材のつめあわせ（金色のトリュフ・サフラン・キャビア）'},
];
const aucToday = () => unl('auction') && merchantHere() && weekDay() === 6;
const aucLot = () => AUC_LOTS[monthKey() % AUC_LOTS.length];
// v0.60 競りをわかりやすく：ライバルの値は目安の0.65〜1.45倍。勝てる見込み＝3人とも自分より安い確率
const AUC_LO = .65, AUC_HI = 1.45;
const aucWinP = (b, v) => { const f = Math.max(0, Math.min(1, (b / v - AUC_LO) / (AUC_HI - AUC_LO))); return f * f * f; };
const aucBidFor = (p, v) => Math.ceil(v * (AUC_LO + (AUC_HI - AUC_LO) * Math.cbrt(p)) / 100) * 100 + (p >= 1 ? 100 : 0);
function aucResolve(my, L, auto, wk = monthKey()) {
  S.aucDone = wk;
  const rivals = ['金獅子亭のレオン', '港食堂のマリサ', '放浪料理人ギン'].map(n => ({n, b:Math.round(L.v * rnd(AUC_LO, AUC_HI) / 100) * 100})), top = rivals.slice().sort((a, b) => b.b - a.b)[0];
  let msg, win = my > top.b;
  if (win) { const pay = Math.min(my, top.b + 100); if (auto) S.gold += my - pay; else S.gold -= pay; S.stat.auction = (S.stat.auction || 0) + 1;
    if (L.k === 'ing') { add(S.inv, L.id, L.n); S.known.i[L.id] = true; } else if (L.k === 'ware') { if (!S.wares) S.wares = {}; S.wares[L.id] = (S.wares[L.id] || 0) + L.n; } else if (L.k === 'outfit') { if (!S.outfits) S.outfits = {apron:1}; S.outfits[L.id] = 1; } else { for (const id of ['truffle', 'saffron', 'caviar']) { add(S.invG, id, 1); S.known.i[id] = true; } }
    msg = `落札！ 一番高い ${fmt(my)}G を付けたので、2番目（${top.n} ${fmt(top.b)}G）＋100G の <b>${fmt(pay)}G</b> で「${L.d}」を手に入れた。${auto ? `預けたお金の残り ${fmt(my - pay)}G は戻った。` : ''}`; }
  else { if (auto) S.gold += my; msg = `${top.n}が ${fmt(top.b)}G で落札した。今回は負け……${auto ? `預けた ${fmt(my)}G はそのまま戻った。` : '（お金は払っていない）'}`; }
  S.aucLast = msg; dirty = true;
  const html = `<div class="tth">🔨 競りの結果${auto ? '（預けた入札）' : ''}</div><div class="ledger"><div><span>宵闇亭（あなた）</span><b>${fmt(my)}G</b></div>${rivals.map(r => `<div><span>${r.n}</span><b>${fmt(r.b)}G</b></div>`).join('')}</div><div class="ttx">${msg}</div>`;
  return {win, msg, html};
}
// 前もって入札（週のいつでも。お金は預かり、土曜10時に自動で競る）
function aucPreStep() {
  const P = S.aucPre; if (!P) return;
  const due = P.wk !== monthKey() || (weekDay() === 6 && hmNow() >= 600) || weekDay() === 0;
  if (!due) return; S.aucPre = null;
  if (P.wk !== monthKey() && S.aucDone === P.wk) { S.gold += P.b; return; }
  const L = AUC_LOTS[P.wk % AUC_LOTS.length], r = aucResolve(P.b, L, true, P.wk);
  sfx(r.win ? 'ok' : 'tick'); if (typeof popStory === 'function') popStory(r.html); toast('🔨 ' + r.msg.replace(/<[^>]+>/g, ''), 5000);
}
function openAuction(bid) {
  if (!unl('auction')) return gateMsg('auction');
  tut('auction'); const L = aucLot(), done = S.aucDone === monthKey(), P = S.aucPre && S.aucPre.wk === monthKey() ? S.aucPre : null, live = aucToday();
  const st = Math.max(100, Math.round(L.v * .05 / 100) * 100), b = Math.max(100, bid || (P ? P.b : aucBidFor(.5, L.v))), p = aucWinP(b, L.v);
  const pc = Math.round(p * 100), col = pc >= 80 ? '#8ad08a' : pc >= 40 ? '#e8c060' : '#e87a6a';
  const lo = Math.round(L.v * AUC_LO / 100) * 100, hi = Math.round(L.v * AUC_HI / 100) * 100;
  let html = `<div class="tst">${charHTML('traveler', U * 16)}<div><div class="tth">ドルンの競り</div><div class="ttx" style="font-size:calc(var(--f)*2.9)">「今週の目玉はこれだ。ほかの料理人たちも狙ってるぜ。いくらまで出す？」</div></div></div>
    <div class="h">今週の品：${L.d}</div>
    <div class="p"><b>しくみ</b><br>① 自分の「出せる上限の額」を決める<br>② ライバル3人も値を付ける（目安 ${fmt(L.v)}G の0.65〜1.45倍＝<b>${fmt(lo)}〜${fmt(hi)}G</b> のどこか）<br>③ 一番高い人が、<b>2番目に高い値＋100G</b>だけ払って買う（高めに付けても損しにくい）<br>④ 負けたらお金は払わない。1週に1回</div>`;
  if (done && !P) html += `<div class="p">今週の競りは終わった。${S.aucLast || ''}</div><div class="p">次の品：${AUC_LOTS[(monthKey() + 1) % AUC_LOTS.length].d}（来週の月曜から入札を預けられる）</div>`;
  else {
    html += `<div class="p">入札額：<b style="font-size:1.3em">${fmt(b)}G</b>　<span style="color:${col}">勝てる見込み <b>${pc}%</b></span></div>
    <div style="height:${U * 2}px;background:#140c08;border-radius:${U}px;margin:${U}px 0;overflow:hidden"><div style="height:100%;width:${pc}%;background:${col}"></div></div>
    <div style="display:flex;gap:3px;margin-bottom:4px">${[-4 * st, -st, st, 4 * st].map(v => `<div class="btn" data-ab="${b + v}" style="flex:1">${v > 0 ? '+' : ''}${fmt(v)}</div>`).join('')}</div>
    <div style="display:flex;gap:3px;margin-bottom:4px">${[[.5, '見込み50%'], [.8, '80%'], [1, '必ず勝つ']].map(([q, n]) => `<div class="btn" data-ab="${aucBidFor(q, L.v)}" style="flex:1;font-size:.85em">${n}<br>${fmt(aucBidFor(q, L.v))}G</div>`).join('')}</div>`;
    if (live && !P) html += `<div class="btn big grn ${S.gold >= b ? '' : 'dis'}" data-ago="${b}">いま、この額で入札する</div>`;
    else if (P) html += `<div class="p" style="color:#8ad0c8">📨 ${fmt(P.b)}G で入札を預けてある。土曜の10時に自動で競り、結果を知らせる（勝てば差額、負ければ全額が戻る）。</div><div style="display:flex;gap:3px"><div class="btn ${S.gold + P.b >= b ? 'grn' : 'dis'}" data-pre="${b}" style="flex:1">${fmt(b)}G に変える</div><div class="btn" data-a="cancel" style="flex:1">取り消す</div></div>`;
    else html += `<div class="btn big grn ${S.gold >= b ? '' : 'dis'}" data-pre="${b}">📨 この額で入札を預ける</div><div class="p">お金は預かり、土曜の10時に自動で競る（寝ていても・留守でもよい）。勝てば2番目＋100Gを払い、差額は戻る。負ければ全額戻る。</div>`;
  }
  modal('行商人の競り', html, 'auction');
  bind('[data-ab]', d => openAuction(Math.max(100, +d.ab)));
  bind('[data-ago]', d => { const my = +d.ago; if (S.gold < my || S.aucDone === monthKey() || !aucToday()) return; const r = aucResolve(my, L, false); sfx(r.win ? 'ok' : 'break'); popStory(r.html, () => openAuction()); });
  bind('[data-pre]', d => { const my = +d.pre, old = P ? P.b : 0; if (S.gold + old < my || S.aucDone === monthKey()) return; S.gold += old - my; S.aucPre = {wk:monthKey(), b:my}; dirty = true; sfx('ok'); toast(`📨 ${fmt(my)}G で入札を預けた。土曜の10時に結果が出る。`); if (live) aucPreStep(); else openAuction(my); });
  bind('[data-a=cancel]', () => { if (!S.aucPre) return; S.gold += S.aucPre.b; S.aucPre = null; dirty = true; toast('預けた入札を取り消した（お金は戻った）。'); openAuction(); });
}

// ---------- となり町の支店
const BR_COST = [50000, 100000, 200000, 400000, 800000], BR_RATE = [0, 180, 390, 680, 1050, 1500];
const brRate = () => BR_RATE[(S.branch && S.branch.lv) || 0] * (1 + .1 * rankIdx());
function branchStep(dt) { if (!S.branch || !S.branch.lv) return; const g = brRate() * dt / 60; S.branch.acc = (S.branch.acc || 0) + g; if (S.branch.acc >= 1) { const n = Math.floor(S.branch.acc); S.branch.acc -= n; S.gold += n; S.branch.total = (S.branch.total || 0) + n; rep_.branch = (rep_.branch || 0) + n; } }
function branchHTML() {
  if (!unl('branch')) return '';
  const lv = (S.branch && S.branch.lv) || 0, c = BR_COST[lv];
  return `<div class="h">🏙 となり町の支店「宵闇亭 二号店」</div><div class="row"><div class="t"><b>${lv ? `支店 Lv${lv}${lv >= 5 ? '（最大）' : ''}` : 'まだ支店はない'}</b><span>支店は自動で営業し、ゲームを閉じている間も1時間ごとに売上が届く（店の格が高いほど多い）。<br>${lv ? `今：1時間あたり約${fmt(brRate())}G　これまでの売上 ${fmt((S.branch.total) || 0)}G` : `出店すると1時間あたり約${fmt(BR_RATE[1] * (1 + .1 * rankIdx()))}G`}${lv < 5 ? `<br>次のLv：1時間あたり約${fmt(BR_RATE[lv + 1] * (1 + .1 * rankIdx()))}G` : ''}</span></div>${lv < 5 ? `<div class="btn ${S.gold >= c ? '' : 'dis'}" data-br="1">${lv ? '広げる' : '出店する'}<br>${fmt(c)}G</div>` : ''}</div>`;
}
function bindBranch() { bind('[data-br]', () => { const lv = (S.branch && S.branch.lv) || 0, c = BR_COST[lv]; if (lv >= 5 || S.gold < c) return; S.gold -= c; if (!S.branch) S.branch = {lv:0, total:0}; S.branch.lv++; sfx('ok'); tut('branch'); dirty = true; toast(`🏙 支店が Lv${S.branch.lv} になった！`, 3000); openFac(); }); }

// ---------- 食材の相場
const TRADE = [{id:'beef', b:120}, {id:'wine', b:160}, {id:'saffron', b:300}, {id:'truffle', b:420}, {id:'caviar', b:600}];
function tradeIdx(id, d) { const s = id.charCodeAt(0) * 7 + id.length * 13; const h = Math.sin(d * 12.9898 + s * 78.233) * 43758.5453, n = h - Math.floor(h);
  return Math.max(.35, Math.min(1.9, 1 + .4 * Math.sin(d * .9 + s) + .22 * Math.sin(d * 2.3 + s * 1.7) + (n - .5) * .3)); }
const tradeBuy = (t, d = gday()) => Math.round(t.b * tradeIdx(t.id, d)), tradeSell = (t, d = gday()) => Math.round(t.b * tradeIdx(t.id, d) * .92);
function openTrade() {
  if (!unl('trade')) return gateMsg('trade');
  tut('trade'); if (!S.trade) S.trade = {};
  let html = mkSeg() + `<div class="p">高級食材の相場は毎日上下する。安い日に買って、高い日に売ろう（売値は買値の92%）。買った品は相場用の蔵にしまわれ、料理には使わない。</div>`;
  for (const t of TRADE) { const o = S.trade[t.id] || {n:0, cost:0}, bp = tradeBuy(t), sp = tradeSell(t), hist = [6, 5, 4, 3, 2, 1, 0].map(k => tradeIdx(t.id, gday() - k));
    const spark = hist.map((v, i) => `<i style="display:inline-block;width:${U * 1.6}px;height:${Math.round(v * U * 4)}px;background:${i === 6 ? '#e8b858' : '#6a5a4a'};margin-right:1px;vertical-align:bottom"></i>`).join('');
    const avg = o.n ? Math.round(o.cost / o.n) : 0;
    html += `<div class="row">${ingIc(t.id, U * 11, false, true)}<div class="t"><b>${ingName(t.id)}　<span style="color:${bp > t.b ? '#e07a6a' : '#8ad08a'}">${bp > t.b ? '▲' : '▼'}${Math.round(tradeIdx(t.id, gday()) * 100)}%</span></b><span>買 ${fmt(bp)}G　売 ${fmt(sp)}G　蔵 ${o.n}個${o.n ? `（平均 ${fmt(avg)}G）` : ''}</span><div style="height:${U * 8}px;display:flex;align-items:flex-end">${spark}</div></div>
      <div style="display:flex;flex-direction:column;gap:2px"><div class="btn ${S.gold >= bp * 10 ? '' : 'dis'}" data-tb="${t.id}" style="padding:2px 6px">10個買う</div><div class="btn ${o.n ? '' : 'dis'}" data-ts="${t.id}" style="padding:2px 6px">全部売る</div></div></div>`; }
  html += `<div class="p">これまでの相場の損益：<b style="color:${(S.tradePL || 0) >= 0 ? '#8ad08a' : '#e07a6a'}">${(S.tradePL || 0) >= 0 ? '+' : ''}${fmt(S.tradePL || 0)}G</b></div>`;
  modal('霧月通りの市場', html, 'market');
  bind('[data-t]', d => { mkTab = d.t; openMarket(); });
  bind('[data-tb]', d => { const t = TRADE.find(x => x.id === d.tb), c = tradeBuy(t) * 10; if (S.gold < c) return; S.gold -= c; const o = S.trade[t.id] || (S.trade[t.id] = {n:0, cost:0}); o.n += 10; o.cost += c; sfx('coin'); dirty = true; openTrade(); });
  bind('[data-ts]', d => { const t = TRADE.find(x => x.id === d.ts), o = S.trade[t.id]; if (!o || !o.n) return; const g = tradeSell(t) * o.n, pl = g - o.cost; S.gold += g; S.tradePL = (S.tradePL || 0) + pl; if (pl > 0) S.stat.tradeWin = (S.stat.tradeWin || 0) + 1; S.trade[t.id] = {n:0, cost:0}; sfx(pl >= 0 ? 'ok' : 'break'); toast(`${ingName(t.id)}を売った：${pl >= 0 ? '+' : ''}${fmt(pl)}G`, 3000); dirty = true; openTrade(); });
}

// ---------- 従業員の修行の旅
const trainCost = () => 30000 * (1 + (S.stat.train || 0));
const MASTER_D = {cook:'料理の品質 +0.3・速さ +40%', clerk:'客足 +5%・速さ +40%', farmer:'ときどき収穫 +1・速さ +40%', fisher:'速さ +40%', miner:'速さ +40%'};
const masterN = k => { syncEmp(); return S.emp[k].filter(e => e.master).length; };
const isAway = e => e && e.away && e.away > S.t;
function trainStep(vis) { if (!S.emp) return; for (const k in S.emp) for (const e of S.emp[k]) if (e.away && e.away <= S.t && !e.master) { e.master = true; e.away = 0; dirty = true; (vis && !simulating ? popStory : news)(`<div class="tth">🧳 ${e.nm}が修行の旅から帰ってきた</div><div class="ttx">「ただいま戻りました。向こうで奥義を身につけてきました！」<br><b>奥義：${MASTER_D[k]}</b></div>`); } }
function trainBtn(k, i, e) { if (eLv(e) < 10) return ''; if (e.master) return `<span class="chipin ok">奥義：${MASTER_D[k]}</span>`; if (isAway(e)) return `<span class="chipin">🧳 修行中（あと${fmtLeft(e.away - S.t)}）</span>`; if (!unl('training')) return '';
  return `<div class="btn ${S.gold >= trainCost() ? '' : 'dis'}" data-train="${k}|${i}" style="margin-top:2px">🧳 修行の旅に出す（${fmt(trainCost())}G・2日間いなくなる）</div>`; }
function bindTrain() { bind('[data-train]', d => { const [k, i] = d.train.split('|'), e = S.emp[k][+i], c = trainCost(); if (S.gold < c || e.master || isAway(e)) return; S.gold -= c; e.away = S.t + 2880; S.stat.train = (S.stat.train || 0) + 1; tut('training'); sfx('door'); dirty = true; toast(`🧳 ${e.nm}が修行の旅に出た。2日後に戻ってくる。`, 3500); openStaff(); }); }

// ---------- 福引き所の露店（広場）
function drawFukuStall() {
  if (!unl('lottery')) return;
  const x = 44, y = 286; ctx.fillStyle = '#2a1a10'; ctx.fillRect(x, y + 6, 20, 12); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x + 1, y + 7, 18, 10);
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#e8e0d0' : '#c83a2a'; ctx.fillRect(x - 1 + i * 4.4, y, 5, 5); }
  ctx.fillStyle = '#c8a040'; ctx.fillRect(x + 6, y + 8, 8, 6); ctx.fillStyle = '#8a6a2a'; ctx.fillRect(x + 8, y + 9, 4, 4); ctx.fillStyle = '#e8c860'; ctx.fillRect(x + 9, y + 10, 2, 2);
  const c = ['#ffd860', '#e84a3a', '#4a8ae8', '#5ac85a'][(tNow * 2 | 0) % 4]; ctx.fillStyle = c; ctx.fillRect(x + 15, y + 15, 2, 2);
}

// ===== v0.24: 採集の地図・バイオーム・なぞってまとめ取り・コンボ・群生・採集Lv・今日の収穫・相棒の犬・ごほうびの仕掛け
const BIOS = [
  {id:'wilds', n:'霧の森と月光の浜', sc:'wilds', zones:['forest', 'beach'], mx:34, my:128, min:10, cond:() => unl('forage'), lock:'釣りをすると行けるようになる',
    gim:{cell:0, x:100, y:68, n:'実のなる大木', verb:'揺らす', give:[['kuri', 4], ['walnut', 2]], msg:'木を揺らすと、実がばらばらと落ちてきた！'}, gim2:{cell:1, x:32, y:356, n:'砂の盛り上がり', verb:'掘る', give:[['asari', 4], ['sazae', 1]], msg:'砂を掘ると、貝がごろごろ出てきた！'},
    entry:[72, 22]},
  {id:'river', n:'川辺と滝', sc:'b_river', zones:['river'], mx:50, my:62, min:20, cond:() => unl('season'), lock:'季節が始まると行ける（採集の目標のあと）',
    gim:{cell:2, x:92, y:166, n:'仕掛け網', verb:'引き上げる', give:[['river_shrimp', 4], ['sawagani', 2]], msg:'網を引き上げると、エビとカニがぴちぴち跳ねている！'}},
  {id:'flower', n:'花畑の丘', sc:'b_flower', zones:['flower'], mx:112, my:80, min:25, cond:() => unl('quality'), lock:'レシピを10種類見つけると行ける',
    gim:{cell:3, x:14, y:122, n:'野生の蜂の巣', verb:'いぶして取る', give:[['honeycomb', 2], ['lavender', 2]], msg:'煙でいぶすと、蜂が離れていった。蜜たっぷりの巣だ！'}},
  {id:'marsh', n:'霧の湿地', sc:'b_marsh', zones:['marsh'], mx:22, my:90, min:30, cond:() => unl('mine'), lock:'地下迷宮が開くと行ける',
    gim:{cell:4, x:92, y:182, n:'蓮の群れ', verb:'引き抜く', give:[['renkon', 3], ['junsai', 2]], msg:'泥の中から、太い蓮根がずるりと抜けた！'}},
  {id:'volcano', n:'火山のふもと', sc:'b_volcano', zones:['volcano'], mx:118, my:42, min:45, cond:() => S.mine && S.mine.max >= 20, lock:'地下迷宮のB20にたどり着くと行ける',
    gim:{cell:5, x:80, y:92, n:'温泉のかご', verb:'引き上げる', give:[['onsen_egg', 4], ['volcano_salt', 1]], msg:'温泉のかごを上げると、とろとろの卵がゆであがっていた！'}},
  {id:'snow', n:'雪の高原', sc:'b_snow', zones:['snow'], mx:30, my:42, min:50, cond:() => S.mine && S.mine.max >= 30, lock:'地下迷宮のB30にたどり着くと行ける',
    gim:{cell:6, x:28, y:246, n:'こんもりした雪', verb:'掘る', give:[['snow_carrot', 4], ['yukitake', 1]], msg:'雪を掘ると、甘いにんじんがたくさん埋まっていた！'}},
  {id:'moon', n:'月光の森', sc:'b_moon', zones:['moon'], mx:82, my:36, min:40, night:1, cond:() => unl('night'), lock:'裏営業が開くと行ける（夜だけ）',
    gim:{cell:7, x:98, y:112, n:'銀の切り株', verb:'触れる', give:[['silver_walnut', 2], ['star_fruit', 1], ['moon_moss', 2]], msg:'切り株に触れると、銀色の光と一緒に実がこぼれ落ちた！'}},
];
const BIOI = Object.fromEntries(BIOS.map(b => [b.id, b])), bioOfScene = sc => BIOS.find(b => b.sc === sc);
const isBio = () => !!bioOfScene(scene);
// walk areas for biome scenes
const RIVER_BLK = (() => { const pts = [[68, 78], [76, 104], [66, 132], [52, 160], [58, 190], [80, 216], [94, 246], [84, 276], [70, 300], [74, 320]], out = [];
  for (let i = 0; i < pts.length - 1; i++) { const [xa, ya] = pts[i], [xb, yb] = pts[i + 1]; for (let t = 0; t < 4; t++) { const x = xa + (xb - xa) * t / 4, y = ya + (yb - ya) * t / 4; if ((y > 150 && y < 168) || (y > 234 && y < 256)) continue; out.push([x - 13, y - 5, x + 13, y + 9]); } } return out; })();
const BIO_WALK = {
  b_river:{areas:[[2, 50, 142, 318]], blocks:[[0, 0, 144, 52], [32, 46, 106, 84], ...RIVER_BLK, [10, 150, 18, 162], [128, 196, 136, 208]]},
  b_flower:{areas:[[2, 56, 142, 318]], blocks:[[104, 0, 130, 54], [2, 164, 52, 178], [102, 238, 132, 256], [86, 266, 120, 290], [18, 132, 26, 152]]},
  b_marsh:{areas:[[2, 4, 142, 318]], blocks:[[6, 36, 66, 64], [82, 76, 138, 108], [2, 132, 54, 168], [72, 180, 136, 212], [10, 236, 70, 264], [96, 266, 140, 290]]},
  b_volcano:{areas:[[2, 58, 142, 318]], blocks:[[0, 0, 144, 58], [72, 92, 112, 116], [22, 150, 58, 170], [72, 234, 104, 254], [108, 212, 138, 230]]},
  b_snow:{areas:[[2, 46, 142, 318]], blocks:[[0, 0, 144, 46], [84, 30, 140, 80], [58, 146, 120, 184], [2, 272, 60, 286]]},
  b_moon:{areas:[[2, 20, 142, 318]], blocks:[[42, 44, 102, 72], [8, 50, 20, 82], [126, 72, 138, 104], [4, 182, 16, 214], [128, 222, 140, 254]]},
};
for (const b of BIOS) if (b.sc !== 'wilds') {
  WALKDEF[b.sc] = BIO_WALK[b.sc];
  SCENES[b.sc] = {name:b.n, short:b.n, objs:[
    {id:'map', lb:'採集の地図をひらく', r:[16, 290, 44, 312], st:[40, 300], act:() => openBioMap()},
    {id:'gim', lb:b.gim.n + 'を' + b.gim.verb, r:[b.gim.x, b.gim.y, b.gim.x + 24, b.gim.y + 24], st:[b.gim.x + 12, b.gim.y + 28], cond:() => gimReady(b), act:() => useGim(b, b.gim)},
    {id:'dog', lb:'迷子の犬に餌をあげる', r:[112, 266, 132, 284], st:[108, 284], cond:() => b.id === 'river' && dogStray(), act:() => feedDog()},
  ]};
}
// wilds: map instead of direct exit / extra gimmicks
SCENES.wilds.objs = SCENES.wilds.objs.filter(o => o.id !== 'up');
SCENES.wilds.objs.push({id:'up', lb:'採集の地図をひらく', r:[54, 0, 90, 14], st:[72, 18], act:() => openBioMap()},
  {id:'gimA', lb:'実のなる大木を揺らす', r:[100, 68, 124, 92], st:[112, 96], cond:() => gimReady(BIOI.wilds, 0), act:() => useGim(BIOI.wilds, BIOI.wilds.gim, 0)},
  {id:'gimB', lb:'砂の盛り上がりを掘る', r:[32, 356, 56, 380], st:[44, 384], cond:() => gimReady(BIOI.wilds, 1), act:() => useGim(BIOI.wilds, BIOI.wilds.gim2, 1)});
{ const o = SCENES.outside.objs.find(o => o.id === 'toWilds'); if (o) { o.lb = '採集の地図（森・浜・川…）'; o.act = () => !unl('forage') ? gateMsg('forage') : openBioMap(); } }

// ---------- state helpers
const BASKET = [40, 60, 90, 130, 200], BASKET_C = [1500, 5000, 15000, 40000];
const basketCap = () => BASKET[S.basketLv || 0];
const FLV_XP = [0, 30, 80, 160, 280, 450, 700, 1000, 1400, 1900];
function flv() { if (!S.flv) S.flv = {lv:1, xp:0}; return S.flv; }
function bioDay(b) { if (!S.bio) S.bio = {}; const st = S.bio[b.id] || (S.bio[b.id] = {d:-1, v:0, seen:0}); if (st.d !== gday()) { st.d = gday(); st.v = 0; st.g = [0, 0]; } return st; }
const gimReady = (b, k = 0) => { const st = bioDay(b); return !st.g || !st.g[k]; };
const dayHash = (d, s) => { const h = Math.sin(d * 12.9898 + s * 78.233) * 43758.5453; return h - Math.floor(h); };
const bioCluster = b => dayHash(gday(), b.id.length * 7 + b.id.charCodeAt(0)) < .55 + flv().lv * .03;
const isShroom = id => /take|shroom|mushroom|shiitake|matsutake/.test(id);
const FLOWERS = new Set(['nasturtium', 'lavender', 'chamomile', 'ghost_lily', 'dew_grass', 'rosehip']);
function bioPool(z) { return ING.filter(g => g.src[0] === 'forage' && g.src[1] === z); }
function itemWeight(g) {
  let w = 1; const rare = g.value >= 40; if (rare) w *= .45 * (1 + flv().lv * .08);
  if (isShroom(g.id) && (wxOn('rain') || wxOn('fog'))) w *= 2.5;
  if (FLOWERS.has(g.id) && wxOn('sun')) w *= 1.8;
  const se = seasonIdx(); if (se === 0 && (FLOWERS.has(g.id) || ['sansai', 'seri', 'cress', 'bamboo'].includes(g.id))) w *= 1.6;
  if (se === 2 && (isShroom(g.id) || ['kuri', 'walnut', 'pine_nut', 'hishi', 'silver_walnut'].includes(g.id))) w *= 1.7;
  if (se === 3 && ['snow_carrot', 'frost_berry', 'yukitake', 'oyster'].includes(g.id)) w *= 1.6;
  return w;
}
function bioTodayText(b) {
  const t = [];
  if (wxOn('rain') || wxOn('fog')) t.push((wxOn('rain') ? '雨' : '霧') + '：きのこが多い'); else if (wxOn('sun')) t.push('晴れ：花がよく咲いている'); else if (wxOn('storm')) t.push('嵐のあと：いろいろ打ち上がっている');
  t.push(['春：山菜と花が多い', '夏：みずみずしい物が多い', '秋：きのこと木の実が多い', '冬：雪の下の物が多い'][seasonIdx()]);
  if (bioCluster(b)) t.push('＊群生の気配');
  const v = bioDay(b).v; t.push(v === 0 ? '今日はまだ手つかず' : v === 1 ? '今日2回目（少なめ）' : '今日は取りつくした（わずか）');
  return t.join('　');
}
// spawn points inside the walkable area
const spotCache = {};
function bioSpots(sc) {
  if (spotCache[sc]) return spotCache[sc];
  const wd = WALKDEF[sc], out = [], H = (IMG['bg_' + (sc === 'wilds' ? 'wilds' : sc)] || {height:320}).height;
  for (let y = 24; y < H - 24; y += 7) for (let x = 8; x < 138; x += 7) {
    const xx = x + ((y / 7) % 2) * 3, inA = wd.areas.some(a => xx >= a[0] + 2 && xx <= a[2] - 2 && y >= a[1] + 4 && y <= a[3] - 2), inB = wd.blocks.some(b => xx >= b[0] - 3 && xx <= b[2] + 3 && y >= b[1] - 3 && y <= b[3] + 6);
    if (inA && !inB && !(xx < 50 && y > 286)) out.push([xx, y]);
  }
  return spotCache[sc] = out;
}
function zoneAt(b, y) { return b.id === 'wilds' ? (y < 256 ? 'forest' : 'beach') : b.zones[0]; }
function spawnBio(b, n, cluster) {
  const spots = bioSpots(b.sc).filter(([x, y]) => !S.forage.some(f => Math.abs(f.x - x) < 7 && Math.abs(f.y - y) < 7));
  for (let k = 0; k < n && spots.length; k++) {
    const [x, y] = spots.splice(Math.floor(Math.random() * spots.length), 1)[0], z = zoneAt(b, y), pool = bioPool(z); if (!pool.length) continue;
    const g = wpick(pool.map(g => ({g, w:itemWeight(g)}))).g;
    S.forage.push({z, id:g.id, x:x + (rnd(-2, 2) | 0), y:y + (rnd(-2, 2) | 0), v:2});
  }
  if (cluster) {
    const [x, y] = pick(spots.length ? spots : bioSpots(b.sc)), z = zoneAt(b, y), pool = bioPool(z).filter(g => g.value < 45), g = pick(pool.length ? pool : bioPool(z));
    S.forage.push({z, id:g.id, x, y, v:2, cl:Math.round(rnd(5, 8)) + Math.floor(flv().lv / 3), gold:Math.random() < .07 * luckMul()});
  }
}
function enterBio(b) {
  const st = bioDay(b), fresh = [1, .6, .35, .2][Math.min(3, st.v)]; st.v++; st.seen = 1;
  S.forage = S.forage.filter(f => !b.zones.includes(f.z) && (f.z === 'forest' || f.z === 'beach'));
  const n = Math.round((24 + flv().lv * 2) * fresh * (wxOn('storm') ? 1.2 : 1) * (b.id === 'wilds' ? 1.5 : 1));
  spawnBio(b, n, fresh >= .6 && bioCluster(b));
  if (b.id === 'wilds' && fresh >= .6 && bioCluster(b) && Math.random() < .5) spawnBio(b, 0, true);
  S.ftrip = {b:b.id, items:{}, combo:0, clusters:0, firsts:[], gold:0, dog:{}, gim:0, n:0};
  bioRespawnT = 0; combo = 0;
}
let bioRespawnT = 0, combo = 0, lastPickT = -9, comboFx = null, bioTrail = [], bioSw = null, dogFx = null;
const dogJoined = () => S.dog && S.dog.joined;
const dogStray = () => (!S.dog || !S.dog.joined) && BIOI.river.cond();

// ---------- picking
function bioAdd(id, n, how) { const t = S.ftrip; if (!t) return; t.items[id] = (t.items[id] || 0) + n; t.n += n; if (how === 'dog') t.dog[id] = (t.dog[id] || 0) + n; }
const basketLeft = () => basketCap() - ((S.ftrip && S.ftrip.n) || 0);
function collectF(f, viaSwipe) {
  if (!S.forage.includes(f)) return false;
  if (basketLeft() <= 0) { if (!collectF.warned || tNow - collectF.warned > 3) { collectF.warned = tNow; toast('🧺 かごがいっぱい。地図から持ち帰ろう（かごは地図の画面で大きくできる）', 3000); tut('bio_full'); } return false; }
  S.forage = S.forage.filter(x => x !== f);
  if (tNow - lastPickT < 1.3) combo++; else combo = 1; lastPickT = tNow;
  const L = flv(); let n = f.cl || 1;
  if (!f.cl) { if (Math.random() < L.lv * .05 + (S.gear && gearAccOn('ring_forage') ? .15 : 0)) n++; if (combo >= 5) n++; if (combo >= 12) n++; }
  n = Math.min(n, basketLeft());
  const first = !S.known.i[f.id], gold = f.gold || Math.random() < .04 * luckMul();
  withQ(rnd(1.4, 2.6) + (L.lv >= 5 ? .2 : 0), () => giveBag('i', f.id, gold, n)); S.known.i[f.id] = true;
  S.stat.foraged = (S.stat.foraged || 0) + 1; bioAdd(f.id, n); if (scene === 'b_moon') legRoll(.004, 'gekka', '月光の森の奥で、白い花がひらいていた。');
  const t = S.ftrip; if (t) { t.combo = Math.max(t.combo, combo); if (f.cl) t.clusters++; if (gold) t.gold++; if (first && !t.firsts.includes(f.id)) t.firsts.push(f.id); }
  L.xp += f.cl ? 3 : 1; while (L.lv < 10 && L.xp >= FLV_XP[L.lv]) { L.lv++; toast(`🌿 採集Lv${L.lv}！ 一度に取れる量と珍しい物の出やすさが上がった`, 3500); sfx('ok'); }
  sfx(f.cl ? 'ok' : 'pop'); dirty = true;
  floatAt(f.x - 3, f.y - 10, `${f.cl ? '群生！' : ''}${ingName(f.id)} +${n}`, gold ? 'gold' : 'info');
  if (combo >= 3) comboFx = {n:combo, t:1.2, x:f.x, y:f.y};
  if (f.cl) tut('bio_cluster'); if (combo === 5) tut('bio_combo');
  return true;
}
function useGim(b, g, k = 0) {
  const st = bioDay(b); if (!st.g) st.g = [0, 0]; if (st.g[k]) return toast('今日はもう取ってしまった。明日また来よう。');
  st.g[k] = 1; tut('bio_gim'); sfx('ok'); gimFx = {x:g.x + 12, y:g.y + 12, t:1, cell:g.cell};
  const got = [];
  for (const [id, n0] of g.give) { const n = Math.min(n0 + (flv().lv >= 6 ? 1 : 0), Math.max(0, basketLeft())); if (n <= 0) continue; giveBag('i', id, false, n); S.known.i[id] = true; bioAdd(id, n); got.push(`${ingName(id)}×${n}`); }
  if (S.ftrip) S.ftrip.gim++;
  toast(`${g.msg}<br>${got.join('、') || 'かごがいっぱいで持てなかった……'}`, 3800); dirty = true;
}
let gimFx = null;
// ---------- the dog
function feedDog() {
  if (!S.dog) S.dog = {fed:0, day:-1};
  if (S.dog.day === gday()) return toast('迷子の犬は満足そうに丸くなっている。（餌は1日1回）');
  const food = ['pork', 'beef', 'chicken', 'boar', 'aji', 'saba', 'ayu', 'trout', 'river_shrimp'].find(id => haveIng(id));
  const dish = !food && Object.keys(S.dish).find(k => S.dish[k] > 0);
  if (!food && !dish) return toast('迷子の犬がじっとこちらを見ている。肉か魚、料理をあげると喜びそうだ。');
  if (food) takeIng(food, false, 1); else add(S.dish, dish, -1);
  S.dog.fed++; S.dog.day = gday(); sfx('ok'); dirty = true; tut('bio_dog');
  if (S.dog.fed >= 3) { S.dog.joined = true; S.dog.name = 'コムギ';
    popStory(`<div class="tunl">🐕 相棒ができた</div><div class="tth">迷子の犬がついてきた</div><div class="ttx">3日続けて餌をあげると、犬はしっぽを振って足もとに座った。<br>首輪に「コムギ」と書いてある。<br><br>これからは採集に一緒に来て、落ちている物を拾ってきたり、土の中の物を掘り当てたりしてくれる。</div>`);
  } else toast(`${food ? ingName(food) : dishInfo(dish).name}をあげた。犬はしっぽを振っている。（${S.dog.fed}/3）<br>また明日も来てみよう。`, 3500);
}
const dogPos = {x:0, y:0, f:0, sc:''};
function dogStep(dt) {
  if (!dogJoined() || !isBio()) return;
  if (dogPos.sc !== scene) { dogPos.sc = scene; dogPos.x = player.x - 10; dogPos.y = player.y + 4; }
  const tx = player.x - 12, ty = player.y + 6, dx = tx - dogPos.x, dy = ty - dogPos.y, d = Math.hypot(dx, dy);
  if (d > 4) { const sp = Math.min(d, 60 * dt); dogPos.x += dx / d * sp; dogPos.y += dy / d * sp; dogPos.f += dt * 8; dogPos.mv = true; dogPos.flip = dx < 0; } else dogPos.mv = false;
  S.dog.t = (S.dog.t || 0) + dt;
  if (S.dog.t > 22 && basketLeft() > 0) { S.dog.t = 0; const b = bioOfScene(scene), z = zoneAt(b, player.y), pool = bioPool(z); if (!pool.length) return;
    const g = Math.random() < .25 ? wpick(pool.map(g => ({g, w:g.value}))).g : pick(pool), n = Math.min(Math.random() < .3 ? 2 : 1, basketLeft());
    giveBag('i', g.id, false, n); S.known.i[g.id] = true; bioAdd(g.id, n, 'dog'); dogFx = {t:2.2, id:g.id}; sfx('pop'); floatAt(dogPos.x - 4, dogPos.y - 12, `${S.dog.name}：${ingName(g.id)} +${n}`, 'info'); }
}
// ---------- swipe input
function bioWorldXY(e) { const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 144, sy = (e.clientY - r.top) / r.height * LH; return [x, sy - OFF + camY, sy]; }
function bioSwipeMove(e) {
  if (!bioSw) return; const [x, y] = bioWorldXY(e);
  if (!bioSw.moved && Math.hypot(e.clientX - bioSw.cx, e.clientY - bioSw.cy) > 9) { bioSw.moved = true; tut('bio_swipe'); }
  if (!bioSw.moved) return;
  const [px, py] = bioSw.pts[bioSw.pts.length - 1]; bioSw.pts.push([x, y]); bioTrail.push({x, y, t:.5}); if (bioTrail.length > 40) bioTrail.shift();
  for (const f of S.forage.slice()) { const fx = f.x, fy = f.y - 4, vx = x - px, vy = y - py, l2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((fx - px) * vx + (fy - py) * vy) / l2));
    if (Math.hypot(px + vx * t - fx, py + vy * t - fy) < (f.cl ? 12 : 9)) collectF(f, true); }
}
window.addEventListener('pointermove', bioSwipeMove);
window.addEventListener('pointerup', e => { if (!bioSw) return; const s = bioSw; bioSw = null; if (!s.moved) bioTap(s.x0, s.y0); });
window.addEventListener('pointercancel', () => { bioSw = null; });
function bioTap(x, y) {
  const f = S.forage.find(f => Math.abs(f.x - x) < (f.cl ? 11 : 8) && Math.abs(f.y - 4 - y) < (f.cl ? 11 : 9));
  if (f) { collectF(f); return; }
  canvasTap(x, y);
}
// ---------- update & draw
function bioStep(dt) {
  if (!isBio()) return;
  bioRespawnT += dt; const b = bioOfScene(scene);
  if (bioRespawnT > 14) { bioRespawnT = 0; const cur = S.forage.filter(f => b.zones.includes(f.z)).length; if (cur < 10) spawnBio(b, 1, false); }
  if (tNow - lastPickT > 1.3) combo = 0;
  dogStep(dt);
}
function drawForageItems() {
  for (const f of S.forage) {
    if (scene === 'wilds' ? !['forest', 'beach'].includes(f.z) : !bioOfScene(scene).zones.includes(f.z)) continue;
    if (f.cl) {
      const pulse = .55 + .25 * Math.sin(tNow * 3 + f.x);
      const g = ctx.createRadialGradient(f.x, f.y - 3, 0, f.x, f.y - 3, 15); g.addColorStop(0, f.gold ? `rgba(255,220,90,${pulse})` : `rgba(255,240,170,${pulse * .8})`); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.fillRect(f.x - 15, f.y - 18, 30, 30);
      for (let k = 0; k < 5; k++) drawIcon(ING[INGI[f.id]].icon, f.x - 9 + (k % 3) * 6 - (k > 2 ? -3 : 0), f.y - 11 + (k > 2 ? 5 : 0), 8);
      if (Math.sin(tNow * 4 + f.y) > .3) { ctx.fillStyle = '#fff8d0'; ctx.fillRect(f.x + 7, f.y - 13, 1, 1); ctx.fillRect(f.x - 9, f.y - 6, 1, 1); ctx.fillRect(f.x + 2, f.y - 16, 1, 1); }
      continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(f.x - 3, f.y + 1, 7, 1);
    drawIcon(ING[INGI[f.id]].icon, f.x - 4, f.y - 8 + Math.round(Math.sin(tNow * 2 + f.x) * .6), 9);
    if (Math.sin(tNow * 3 + f.x) > .55) { ctx.fillStyle = '#fffbd0'; ctx.fillRect(f.x + 4, f.y - 9, 1, 1); ctx.fillRect(f.x - 5, f.y - 3, 1, 1); }
  }
}
function drawGim(g, ready) {
  if (!IMG.gimmick) return; let ox = 0;
  if (gimFx && gimFx.cell === g.cell && gimFx.t > 0) ox = Math.round(Math.sin(gimFx.t * 40) * 1.5 * gimFx.t);
  ctx.drawImage(IMG.gimmick, g.cell * 24, ready ? 0 : 24, 24, 24, g.x + ox, g.y, 24, 24);
  if (ready && Math.sin(tNow * 2.5) > .2) { ctx.fillStyle = '#ffe890'; ctx.fillRect(g.x + 11, g.y - 3, 2, 2); ctx.fillRect(g.x + 12, g.y - 5, 1, 1); }
}
function drawBioAmbient(b) {
  const T = tNow;
  if (b.id === 'river') { for (let y = 0; y < 56; y += 2) { if ((y + Math.floor(T * 20)) % 6 === 0) { ctx.fillStyle = 'rgba(240,250,255,.8)'; ctx.fillRect(58 + ((y * 7) % 20), y, 2, 1); } }
    for (let k = 0; k < 8; k++) { const a = (T * .7 + k) % 1; ctx.fillStyle = `rgba(230,245,255,${.5 * (1 - a)})`; ctx.fillRect(48 + k * 6, 56 - a * 8, 2, 1); } }
  if (b.id === 'flower') for (let k = 0; k < 7; k++) { const x = (k * 41 + T * 12 + Math.sin(T + k) * 10) % 150 - 3, y = 70 + (k * 37) % 220 + Math.sin(T * 2 + k) * 6, w = Math.sin(T * 12 + k) > 0;
    ctx.fillStyle = ['#f0f0f0', '#f0c84a', '#e86a9a', '#a8c8f0'][k % 4]; ctx.fillRect(x, y, 1, 1); if (w) { ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1); } }
  if (b.id === 'marsh') { for (let k = 0; k < 4; k++) { const y = 30 + k * 80, x = ((T * 4 + k * 50) % 200) - 40; ctx.fillStyle = 'rgba(200,220,210,.10)'; ctx.fillRect(x, y, 60, 6); ctx.fillRect(x + 10, y - 2, 40, 2); }
    for (let k = 0; k < 5; k++) { const x = 20 + k * 27 + Math.sin(T * .8 + k) * 8, y = 40 + k * 55 + Math.cos(T * .6 + k) * 6; if (Math.sin(T * 1.7 + k * 2) > -.2) { ctx.fillStyle = 'rgba(170,230,255,.85)'; ctx.fillRect(x, y, 2, 2); ctx.fillStyle = 'rgba(170,230,255,.25)'; ctx.fillRect(x - 1, y - 1, 4, 4); } } }
  if (b.id === 'volcano') { for (const [sx, sy] of [[92, 100], [40, 156], [88, 240]]) for (let k = 0; k < 4; k++) { const a = (T * .5 + k * .25) % 1; ctx.fillStyle = `rgba(235,240,240,${.35 * (1 - a)})`; ctx.fillRect(sx - 6 + k * 4 + Math.sin(T + k) * 2, sy - 4 - a * 16, 3, 2); }
    for (let k = 0; k < 6; k++) { const a = (T * .3 + k / 6) % 1; ctx.fillStyle = `rgba(255,150,60,${1 - a})`; ctx.fillRect(30 + k * 18 + Math.sin(T * 2 + k) * 4, 300 - a * 240, 1, 1); } }
  if (b.id === 'snow') for (let k = 0; k < 40; k++) { const x = (k * 37 + T * 6 + Math.sin(T + k) * 6) % 146 - 1, y = (k * 53 + T * 14) % 320; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x, y, 1, 1); }
  if (b.id === 'moon') for (let k = 0; k < 18; k++) { const x = (k * 29 + Math.sin(T * .5 + k) * 14 + 144) % 144, y = (k * 61 + T * 3) % 320; if (Math.sin(T * 2 + k * 1.3) > -.3) { ctx.fillStyle = k % 3 ? 'rgba(160,230,255,.9)' : 'rgba(210,180,255,.9)'; ctx.fillRect(x, y, 1, 1); } }
}
function drawBio() {
  const b = bioOfScene(scene); if (!b) return;
  if (b.id !== 'wilds') drawBioAmbient(b);
  const st = bioDay(b);
  if (b.id === 'wilds') { drawGim(b.gim, !(st.g && st.g[0])); drawGim(b.gim2, !(st.g && st.g[1])); } else drawGim(b.gim, !(st.g && st.g[0]));
  drawForageItems();
  if (b.id === 'river' && dogStray()) { const fr = S.dog && S.dog.day === gday() ? 3 : 0; ctx.drawImage(IMG.dog, fr * 16, 0, 16, 12, 114, 270, 16, 12);
    if (fr === 0 && Math.sin(tNow * 2) > 0) { ctx.fillStyle = '#e8e0c8'; ctx.fillRect(126, 262, 5, 5); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(128, 263, 1, 2); ctx.fillRect(128, 266, 1, 1); } }
  if (dogJoined()) { const fr = dogPos.mv ? 1 + (Math.floor(dogPos.f) % 2) : dogFx && dogFx.t > 0 ? 4 : 0; ctx.save(); if (dogPos.flip) { ctx.translate(Math.round(dogPos.x) * 2 + 16, 0); ctx.scale(-1, 1); }
    ctx.drawImage(IMG.dog, fr * 16, 0, 16, 12, Math.round(dogPos.x), Math.round(dogPos.y) - 10, 16, 12); ctx.restore();
    if (dogFx && dogFx.t > 0) drawIcon(ING[INGI[dogFx.id]].icon, Math.round(dogPos.x) + (dogPos.flip ? -3 : 11), Math.round(dogPos.y) - 14, 7); }
  // trail
  for (let i = 1; i < bioTrail.length; i++) { const a = bioTrail[i - 1], c = bioTrail[i]; if (a.t <= 0 || c.t <= 0) continue; ctx.strokeStyle = `rgba(255,250,220,${c.t * 1.4})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
}
function drawBioTop() {
  if (!isBio()) return;
  bioTrail.forEach(p => p.t -= 1 / 60); bioTrail = bioTrail.filter(p => p.t > 0);
  if (gimFx) { gimFx.t -= 1 / 60; if (gimFx.t <= 0) gimFx = null; }
  if (dogFx) { dogFx.t -= 1 / 60; if (dogFx.t <= 0) dogFx = null; }
  if (comboFx && comboFx.t > 0) { comboFx.t -= 1 / 60; const a = Math.min(1, comboFx.t * 2), s = 1 + Math.max(0, comboFx.t - 1) * 2;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.font = `bold ${Math.round(9 * s)}px sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = '#3a1a08'; const txt = `コンボ×${comboFx.n}${comboFx.n >= 12 ? '!!' : comboFx.n >= 5 ? '!' : ''}`; ctx.strokeText(txt, 72, 72 + hudRows); ctx.fillStyle = comboFx.n >= 12 ? '#ffd84a' : comboFx.n >= 5 ? '#ffe890' : '#fff4d0'; ctx.fillText(txt, 72, 72 + hudRows);
    if (comboFx.n >= 5) { ctx.font = 'bold 6px sans-serif'; ctx.strokeText(`1回で +${comboFx.n >= 12 ? 2 : 1}`, 72, 80 + hudRows); ctx.fillStyle = '#fff'; ctx.fillText(`1回で +${comboFx.n >= 12 ? 2 : 1}`, 72, 80 + hudRows); }
    ctx.restore(); }
}
// ---------- trip end: harvest result
function finishTrip() {
  const t = S.ftrip; S.ftrip = null; if (!t || !t.n) return;
  const b = BIOI[t.b], rows = Object.entries(t.items).sort((a, c) => c[1] - a[1]);
  const pile = rows.flatMap(([id, n]) => Array(Math.min(3, n)).fill(id)).slice(0, 12);
  tut('bio_result');
  popStory(`<div class="tth" style="text-align:center">🧺 今日の収穫</div><div class="p" style="text-align:center">${b.n}　<b>${t.n}個</b></div>
    <div class="basket">${pile.map((id, i) => `<span style="left:${8 + (i % 6) * 14 + Math.floor(i / 6) * 7}%;bottom:${42 + Math.floor(i / 6) * 22}%">${ingIc(id, U * 9)}</span>`).join('')}</div>
    <div class="ledger">${rows.slice(0, 9).map(([id, n]) => `<div><span>${ingIc(id, U * 6)} ${ingName(id)}${t.firsts.includes(id) ? ' <small style="color:#8ad8c8">初めて！</small>' : ''}${t.dog[id] ? ` <small style="color:#e8c870">${S.dog.name}が拾った</small>` : ''}</span><b>×${n}</b></div>`).join('')}</div>
    <div class="p" style="margin-top:4px">最大コンボ ×${t.combo}　群生 ${t.clusters}か所${t.gim ? '　ごほうびの仕掛け ' + t.gim : ''}${t.gold ? `　<span style="color:#e8c858">金色 ${t.gold}</span>` : ''}<br>採集Lv${flv().lv}（次まで ${flv().lv < 10 ? FLV_XP[flv().lv] - flv().xp : '—'}）</div>`);
}
const _go0 = go;
go = function (sc, x, y) { if (isBio() && sc !== scene) finishTrip(); return _go0(sc, x, y); };

// ---------- map & travel
let bioSel = null, bioMapURL = null;
function bioMapImg() { if (!bioMapURL && IMG.bmap) { const c = document.createElement('canvas'); c.width = IMG.bmap.width; c.height = IMG.bmap.height; c.getContext('2d').drawImage(IMG.bmap, 0, 0); bioMapURL = c.toDataURL(); } return bioMapURL; }
const bioOpenNow = b => b.night ? (hmNow() >= 1200 || hmNow() < 240) : !isDark();
function openBioMap() {
  tut('bio_map');
  const cur = bioOfScene(scene); if (!bioSel || !BIOI[bioSel]) bioSel = (cur && cur.id) || 'wilds';
  const b = BIOI[bioSel], ok = b.cond(), L = flv();
  const nodes = BIOS.map(x => { const o = x.cond(); return `<div class="bnode ${o ? '' : 'lk'} ${x.id === bioSel ? 'sel' : ''}" data-bn="${x.id}" style="left:${x.mx / 144 * 100}%;top:${x.my / 176 * 100}%">${o ? '' : '🔒'}${x.n.replace('霧の森と月光の浜', '森と浜')}${o && bioCluster(x) && bioDay(x).v === 0 ? '<i>＊</i>' : ''}${cur && cur.id === x.id ? '<em>いまここ</em>' : ''}</div>`; }).join('');
  const pool = [...new Set(b.zones.flatMap(z => bioPool(z)))], found = pool.filter(g => S.known.i[g.id]).length;
  const tmin = cur ? Math.round(b.min * .6) : b.min, open = bioOpenNow(b);
  const info = ok ? `<div class="h">${b.n}</div><div class="p" style="color:#8ad8c8">${bioTodayText(b)}</div>
    <div class="p">取れる物（見つけた ${found}/${pool.length}）</div><div class="bslots">${pool.map(g => `<span>${S.known.i[g.id] ? ingIc(g.id, U * 8) : '？'}</span>`).join('')}</div>
    ${cur && cur.id === b.id ? '<div class="p">いまここにいる。</div>' : open ? `<div class="btn big grn" data-bgo="${b.id}">${b.n}へ行く（${tmin}分かかる）</div>` : `<div class="btn big dis">${b.night ? '月光の森は夜（20時〜4時）だけ' : '夜は暗くて危ない（5時〜19時）'}</div>`}`
    : `<div class="h">🔒 ${b.n}</div><div class="p">${b.lock}</div>`;
  const bl = S.basketLv || 0;
  modal('採集の地図', `<div class="bmap" style="background-image:url(${bioMapImg()})">${nodes}</div>${info}
    <div class="row" style="margin-top:4px"><div class="t"><b>採集Lv${L.lv}　かご ${basketCap()}個</b><span>なぞるとまとめて取れる。続けて取るとコンボ。${dogJoined() ? `相棒の${S.dog.name}も一緒。` : ''}</span></div>${bl < BASKET_C.length ? `<div class="btn ${S.gold >= BASKET_C[bl] ? '' : 'dis'}" data-bk="1">かごを${BASKET[bl + 1]}個に<br>${fmt(BASKET_C[bl])}G</div>` : ''}</div>
    ${cur ? `<div class="btn big" data-bhome="1" style="margin-top:4px">宵闇亭へ帰る（${Math.round(cur.min * .8)}分）</div>` : ''}${!cur && unl('expedition') ? '<div class="btn big blu" data-bexp="1" style="margin-top:4px">⚓ 遠征の地図（ほかの町へ）</div>' : ''}`, 'bmap');
  bind('[data-bexp]', () => openExpMap());
  bind('[data-bn]', d => { bioSel = d.bn; openBioMap(); });
  bind('[data-bgo]', d => { closeModal(); bioTravel(BIOI[d.bgo]); });
  bind('[data-bhome]', () => { closeModal(); const c = bioOfScene(scene); if (!c) return; travelMin(Math.round(c.min * .8)); go('outside', 72, 308); });
  bind('[data-bk]', () => { const bl = S.basketLv || 0, c = BASKET_C[bl]; if (S.gold < c) return; S.gold -= c; S.basketLv = bl + 1; sfx('ok'); dirty = true; toast(`🧺 かごが${basketCap()}個入りになった`); openBioMap(); });
}
function travelMin(min) { const o = simulating; simulating = true; for (let k = 0; k < min; k += 2) step(2, false); simulating = o; }
function bioTravel(b) {
  const cur = bioOfScene(scene), m = cur ? Math.round(b.min * .6) : b.min;
  if (cur) finishTrip();
  travelMin(m); toast(`🚶 ${b.n}へ（${m}分）`, 1800);
  const [ex, ey] = b.entry || [40, 296];
  go(b.sc, ex, ey); setTimeout(() => enterBio(b), 420);
}
// new biome notice
function bioNoticeTick() {
  if (!unl('forage')) return; if (!S.bioSeen) S.bioSeen = {wilds:1};
  for (const b of BIOS) if (!S.bioSeen[b.id] && b.cond()) { S.bioSeen[b.id] = 1; news(`<div class="tunl">🗺 新しい採集地</div><div class="tth">${b.n}</div><div class="ttx">採集の地図に「${b.n}」が増えた。<br>${b.night ? '夜（20時〜4時）だけ行ける不思議な森。' : '店の外の広場から、採集の地図をひらいて行ける。'}</div>`); }
}

// ===== v0.25: 説明書（解放済みの機能だけ、具体的に）
const nmK = id => S.known.i[id] ? ingName(id) : '？？？';
const nmL = ids => { const k = ids.filter(id => S.known.i[id]).map(ingName), u = ids.length - k.length; return (k.join('・') || '') + (u ? `${k.length ? '　' : ''}<span style="color:var(--sub)">（まだ見つけていない物 ${u}種）</span>` : ''); };
const secT = v => { v = Math.max(0, Math.round(v)); return v >= 60 ? `${Math.floor(v / 60)}分${v % 60 ? v % 60 + '秒' : ''}` : `${v}秒`; };
const hm = m => m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? m % 60 + '分' : ''}` : `${m}分`;
const li = arr => '<ul class="man">' + arr.map(x => `<li>${x}</li>`).join('') + '</ul>';
const tbl = (head, rows) => `<table class="mtb"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const MAN = [
  {k:'flow', t:'1日の流れ', c:() => true, h:() => li([
    '1日は現実の約24分。昼はゲーム内1分＝現実1秒、夜（18時〜朝6時）は半分の速さで進む。',
    '朝6時に起きる → 畑の世話・料理の仕込み・棚に並べる → 画面上の「🔔開店する」で開店（開けないと10時に自動で開店。店員がいれば9時）。',
    '18時に自動で閉店（「閉店する」でいつでも閉められる）。閉店すると「本日の営業結果」が出る。',
    '夜は、ベッド（厨房の奥）で眠って朝まで飛ばす／地下迷宮／仕込み' + (unl('night') ? '／裏営業（21時〜）' : '') + (unl('forage') && BIOI.moon.cond() ? '／月光の森で採集' : '') + '。深夜2時まで起きていると倒れて朝になる。',
    'ゲームを閉じている間は時間が止まる。画面上の「💤放置」を押してから閉じたときだけ、最大8時間ぶん時間が進み、従業員が働いた結果が届く。'])},
  {k:'ctrl', t:'操作・持ち物・倉庫', c:() => true, h:() => li([
    '画面をタップするとそこへ歩く。物や人をタップすると近くへ行って調べる。下の十字キーでも歩ける。',
    '画面下の8枠が「持ち物」、その上の16枠が「カバン」、大量にしまえるのが「倉庫」（カバンの画面）。',
    'アイテムは長押しか横にすべらせるとドラッグで移動できる。倉庫の物はタップでカバンへ、カバンの物はタップで倉庫へ。',
    'カバンの画面の「カバンを全部倉庫へ」「持ち物もカバンも倉庫へ（道具は残す）」で、まとめてしまえる。',
    '<b>マイセット</b>：持ち物とカバンの並びを3つまで保存。「呼び出す」と、今の物を倉庫にしまってから保存どおりに取り出す（迷宮用・釣り用・畑用など）。セット名はタップで変更。',
    '料理や棚では、倉庫・カバン・持ち物のどこにある物でも使える。'])},
  {k:'farm', t:'畑と作物', c:() => true, h:() => li([
    '店の裏（店内の左上の扉）が農場。種を持ってタップで植え、じょうろで水やりすると成長が速く、品質も上がる。',
    '種は外の市場（広場の左）の「種」で買う。農夫を雇うと、実った作物を収穫して同じ種を植え直してくれる。',
    '畑の区画・スプリンクラー（自動で水やり）・温室（珍しい種）・たい肥箱（肥料）は「施設」タブから。'])
    + tbl(['種', '値段', '育つ時間'], SEEDS.filter(g => !FANTASY.has(g.id) && !HYBS.has(g.id)).slice(0, 40).map(g => [g.name, g.src[1] + 'G', secT(g.src[2])]))},
  {k:'cook', t:'料理とレシピ', c:() => true, h:() => li(['料理人がいると、レシピ帳の各レシピに「上限」が出る。押すたびに ∞→3→5→10→20→40。倉庫と棚にその数あると、料理人はその料理を作らない。', '陳列棚の「手持ちの料理」も🔍で探せる。', '加工器具の「あるだけ」で、材料と予約の空きがある限りまとめて仕込む。', '朝の報告に「今日のやること」（📋の上位・魚市の目玉・行事）が出る。', 'かまどの「🔍」で、食材（自由に作る）や料理名・食材名（レシピ帳）を探せる。', 'レシピ帳で材料が足りなくても、足りない物が全部市場の物なら「買って作る ○G」で一度に作れる。', 
    'かまど（店内の厨房）で、食材を1〜4つと調理法（焼く・煮る・揚げる・蒸す・炊く・生）を選ぶ。合っていればレシピ発見。',
    '外れても「惜しい！」なら、食材が多い・足りない・1つ違う、と合っている食材を1つ教えてくれる。',
    'レシピタブで「ヒント」を買うと、未発見のレシピの食材がわかる（続けて買うと同じレシピの食材がもう1つ。100G→160G→220G…）。',
    '<b>本</b>を買うと、載っているレシピをまとめて覚えられる（覚えたレシピは料理人も作れる）。本は外の市場の「本」タブ。基本の本はいつも並び、珍しい本は日替わりで2冊。',
    '同じ料理を作るほど熟練度★が上がり、価値が上がる。' + (unl('quality') ? '食材の品質★が高いと料理の品質も上がる。' : ''),
    '料理はかまどで自分で作るか、料理人が自動で作る（倉庫に入る）。'])
    + `<div class="p">本（${D.books.length}冊）：</div>` + tbl(['本', '値段', 'レシピ数'], D.books.filter(b => S.books[b.id] || bookStock().has(b.id)).map(b => [b.name + (S.books[b.id] ? ' ✔' : ''), fmt(b.price) + 'G', b.recipes.length]))},
  {k:'shop', t:'陳列・値付け・営業', c:() => true, h:() => li([
    '店内の陳列棚をタップ → 料理を選び、値段を決めて「この値段で販売する」。決めるまでその棚は売れない（閉じても販売開始）。',
    '客の顔で値段がわかる：😊安い（評判↑）、🙂ちょうどいい、😣高い（評判↓）、🙅買わない。ちょうどいいのは料理の価値の100〜110%くらい。',
    '店員を雇うと「自動販売」ができる。値付けの方針（安め・通常・強気）を選べる。',
    '店の格（屋台級→町の食堂→評判の店→名店→伝説の宵闇亭）は評判と売った皿数で上がり、客が増えて高い物も買われるようになる。',
    '評判は高くなるほど上がりにくい。'])},
  {k:'res', t:'通りの住民', c:() => true, h:() => li(['店の前の通りには住民が歩いている。近づいて「話す」と、1日1回 親しさが+1。親しさ3ごとに、その人らしい物をくれる（ミラ・シャズは種やレシピ）。', '好きな物を持って近づくと「贈る」（ミラ・ガルド・シャズは鉱石や宝石、ほかの人は食材）。好きな物なら親しさ+6とお礼のお金。', '時間で顔ぶれが変わる：パン屋のポーラ（朝6〜14時）・花売りのリリ（8〜17時）・郵便屋ピップ（9〜12時・14〜16時）・学者のエルマー（10〜18時）・吟遊詩人カノン（15〜23時）・老漁師トク（5〜9時・16〜19時）・踊り子のサラ（18〜24時）・夜回りのボルツ（19〜翌4時）。', '好きな物：ポーラ＝小麦・蜂蜜・いちご／リリ＝ラベンダー・蜂蜜・いちご／ボルツ＝酒・牛肉・コーヒー豆／カノン＝ワイン・酒・蜂蜜／ピップ＝りんご・パン・牛乳／トク＝酒・米・梅干し／エルマー＝茶葉・抹茶・コーヒー豆／サラ＝チョコレート・いちご・ワイン'])},
  {k:'shugyo', t:'技・武器の成長・修練の塔', c:() => unl('shugyo'), h:() => li(['<b>解放</b>：奈落の深層のB60にたどり着くと。古井戸の画面に「霊峰の修練の塔へ」。',
    '<b>鎧</b>：青いゲージ。技は鎧を2倍の速さで削る。ふつうの攻撃は鎧を3割しか削れず、鎧があるうちは体力に15%しか通らない。',
    '<b>技</b>：攻撃を当てると+7（弓や双剣など回数の多い武器は回数ぶん）、攻撃を受けると+4で、足元のゲージがたまる。満タンで画面上の「⚔技！」。' + Object.entries(SKILLS).map(([k, v]) => `${WT_N[k]}＝${v.n}（${v.d}）`).join('／') + '。技は会心20%、鎧を割れる。',
    '<b>銘の武器</b>（12系列×9種類＝108本）：' + SER_KEYS.map(k => `${SER[k].n}＝${SER[k].d}（技：${SER[k].sk}）`).join('／'),
    '<b>手に入れ方</b>：修練の塔の階の主（必ず1本）・魔物（0.6%）・宝箱、修練の証30と交換（好きな銘と種類）、奈落の深層の魔物（ごくまれ）、専用ダンジョンのボス（12%）。',
    '<b>効果の強さ</b>：拾った武器の効果は、それぞれ強さが60〜140%（【%】で表示）。深い所で拾うほど上振れ。工房の「数値の振り直し」で1つずつ振り直せる（石炭×3・2,000G×(レア度+1)）。',
    '<b>武器の成長</b>：装備中の武器で倒すと経験（ふつう1＋深さ/25、ボス40）。次のLvまで 20＋10×Lv。Lvごとに攻撃+2%（Lv20で+38%）。',
    '<b>覚醒</b>（銘・伝説・ボスの武器、Lv20）：工房で 奈落晶×5・修練の証×10・50,000G。攻撃×1.2・技1.5倍・付与の枠+1、名前に「真・」と光る絵。覚醒のあとは 300＋20×覚醒Lv の経験ごとに+1%（上限なし）。',
    '<b>修練の塔</b>：全30階＋頂（31階）。魔物の強さは、あなたの深層の最深記録の85%の深さに合わせて決まる（B60より浅い記録ならB60相当）。魔物は小鬼（大群れ）・盾持ちの石兵（ふつうの攻撃を7割防ぐ。ひるんでいる間は防げない）・鎧武者（鎧）・修行僧の亡霊・山の鷹。10階＝石の門番ゴーレム、20階＝鎧の大将、頂＝天狗の大師範（どれも鎧つき）。階を初めて制すると証+3（2回目から+1）、階の主は証+10（頂+20）と賞金と銘の武器。11階・21階から登れる。呪いもかけられる。'])},
  {k:'soil', t:'畑の土と輪作', c:() => soilOn(), h:() => li(['区画ごとに<b>土</b>（0〜100、はじめ60）。肥えた土（75〜）＝育ち+12%・品質+0.3〜0.6・25%で収穫+1／ふつう（45〜）／やせた土（25〜）＝育ち-8%・品質が下がる／カラカラ（〜24）＝育ち-20%。区画の色でわかる。',
    '収穫するたびに土が減る（ふつう-5）。<b>前と同じ仲間</b>を続けると<b>連作</b>：土-12・品質-0.4（やせた土なら30%で収穫-1）。<b>ちがう仲間</b>（輪作）：品質+0.3・20%で収穫+1。',
    '仲間：' + Object.entries(CROP_FAM).map(([k, a]) => `${FAM_N[k]}＝${a.slice(0, 5).map(ingName).join('・')}${a.length > 5 ? 'など' : ''}`).join('／'),
    '<b>豆</b>（大豆・枝豆・落花生）は収穫で土+15。香草は-2。肥料をまくと+15、たい肥箱で「たい肥を畑にすき込む」＝2ポイントで全区画+8、空いた区画は1時間に+2（70まで）。',
    '区画を調べると「肥えた土・前は葉もの」のように出る。連作になる種を持っていると⚠。農夫は前と同じ仲間を避け、やせた区画には豆を植える。'])},
  {k:'hill', t:'丘の農地', c:() => unl('hill'), h:() => li(['店の格が「評判の店」になると、裏の農場のいちばん下の道から行ける。', '<b>土地</b>：1区 8,000G → 2区 20,000G → 3区 45,000G（下から順に）。1区ごとに畑8区画・果樹4本。', '<b>特別な畑</b>：棚田（米20個/10分・もち米12個/10分）・茶畑（茶葉12個/10分）は2区、ぶどう棚（ぶどう10個/15分）・きのこの原木（しいたけ・まいたけ・しめじ・えのき）は3区。種いらず、収穫2回分までたまる。雨の日は少し早い。農夫が自動で収穫。', '<b>動物</b>（1区）：羊（羊乳）・ヤギ（ヤギ乳）・豚（トリュフ25%、ほかはきのこ）・アヒル（卵）。小屋で2頭、増築で4頭。えさはいらない。', '<b>加工</b>：乳製品台＝ヤギ乳→ヨーグルト・チーズ、羊乳→クリームチーズ・チーズ。石臼＝茶葉3→抹茶、もち米2→餅5。', '<b>苗木を抜く</b>：果樹をタップ→「苗木を抜く」（2回押し）。苗木代の半分が戻る。果樹園の看板・丘の立て札の「丘の果樹」一覧からも抜ける。'])},
  {k:'tavern', t:'冒険者の酒場', c:() => unl('tavern'), h:() => li(['ギルドの建物の扉から入る。', '<b>カウンター</b>：冒険者の注文が毎朝3件（倒した魔物の素材の料理・行った町の料理も頼まれる）。届けると値打ち×2.2のお金とギルドポイント。', '<b>訓練所</b>（ランクE）：武器の種類ごとの熟練度。その種類の武器で倒すと+1（ボス+15）、Lvごとにその種類の攻撃+2%（最大Lv20）。稽古（300G×次のLv、+15）は1日3回。', '<b>鑑定屋</b>（ランクD）：開いた後に迷宮で拾う希少以上の武器は未鑑定（ランダムな効果がはたらかない）。鑑定は400G×(レア度+1)²、15%で効果が1つ増える。', '<b>闘技場</b>（ランクC）：勝ち抜き（5連戦・10連戦・無限、1日5回）。体力は持ち越しで波の合間に15%回復、倒れても何も失わない。勝った波の数だけメダル（5連戦の完走+5、10連戦+15）とお金、週の最高記録5・10・20・30波でごほうび。倒したボスの強化版（1.5倍）と1日1回ずつ再戦、勝つとメダル12とボスの素材×2。', '<b>メダルの交換所</b>：帰還の巻物・エリクサー・上級回復薬・宝石の袋・訓練の書・英雄の武器。'])},
  {k:'works', t:'武器の工房', c:() => gearSt().list.some(g => !isAcc(g)), h:() => li(['鍛冶屋の「🔨 工房」（武器を1つ持つと出る）。', '<b>鍛え上げ</b>：鍛冶屋で作った武器を、次の素材（銅→鉄→金→…→奈落晶）の同じ型へ。効果・付与・レア度はそのまま。鉱石は作る時の6割、お金は約半分。', '<b>合成</b>：同じ武器2本で、レア度が1つ上がる（並→良→希少→英雄→伝説）。効果と付与の枠も増える。2本目の付与の宝石は返ってくる。', '<b>効果の振り直し</b>：ランダムな効果のついた武器を初めて手に入れると使える。効果を1つ選んで引き直す（3,000G×レア度＋鉱石2個か石炭4個）。', '<b>分解</b>：装備していない武器を鉱石・石炭・付与した宝石に戻す。', '<b>ガルドの依頼</b>：週に1回。今まで掘った一番いい鉱石・石炭・お金を納めると、好きな種類の「ガルド銘」の武器（英雄・効果3つ・攻撃+10%、ここでしか手に入らない）。'])},
  {k:'brewer', t:'仕込み師', c:() => unl('machines'), h:() => li(['従業員タブで雇える（加工器具を1つ置いた後、最大4人）。', '加工器具の加工法の「🤖自動」で、器具ごとに自動で仕込む物を1つ決める。', '仕込み師1人につき20秒ごとに1件、予約の空きがある器具に仕込む。材料は倉庫から（作るリストの分は使わない）。足りない市場の材料は1日の仕入れ予算内で買う。', '得意技：手早い・節約上手（材料代の2割が戻る）・目利き（12%で1つ多い）・夜なべ（加工が10%速い）。'])},
  {k:'fishmk', t:'朝の魚市', c:() => unl('fishing'), h:() => li(['市場の「🐟魚市」。毎朝6時〜10時だけ開く。', '日替わりで魚・貝・エビ・海藻などが5品、それぞれ2〜5個（12%で霧ウナギや奈落魚などの珍しい魚が1つ）。旬の物が並びやすい。', '値段は値打ちの1.5倍（釣るほうが安い）。上の「買う数」で個数を決める。', '魚の図鑑には、釣れる場所・珍しさ・合うエサ・旬が出る。'])},
  {k:'plgrow', t:'主人公の成長', c:() => unl('mine'), h:() => li(['<b>レベル</b>：迷宮・ダンジョンで魔物を倒す（深いほど多い、ボスは60）・岩を砕く（1）と経験。次のLvまで 40×今のLv。Lvごとに最大体力+5・最大気力+4、最大Lv50。今 Lv' + plSt().lv + '（' + plSt().xp + '/' + plNeed(plSt().lv) + '）', '<b>初めての味</b>：迷宮の「食べる」で初めて食べる料理ごとに最大体力+1、2品ごとに最大気力+1（100品まで。今 ' + plSt().an + '品）', 'ほかに：新しい層に初めて着く（体力+15×5）・公衆浴場（体力と気力+20）・究極の料理・老騎士バルド♥4'])},
  {k:'scroll', t:'帰還の巻物', c:() => unl('mine'), h:() => li(['市場の「道具」で120G。迷宮の上の「📜」で使う。', '帰り道のおまけ：その回に拾った物が2割増える。', '帰還の印：次は迷宮の入口（専用ダンジョンの入口）で「その階から再開」を選べる（1回だけ、昇降機のない階でも）。', '持っていれば、倒れそうな時に自動で使われ、拾った物を失わない（エリクサーより先）。'])},
  {k:'forgehut', t:'鍛冶小屋', c:() => true, h:() => li(['古井戸（地下迷宮の入口）の下に、鍛冶屋ガルドの小屋がある。タップで鍛冶の画面。', '「施設」タブのいちばん上の「⚒ 鍛冶屋ガルド」からも、どこにいても開ける。', 'できること：ツルハシの強化・<b>道具の修理（市場の4割の値段）</b>・武器を作る・付与・防具・宝石の器・鍛え直し（解放した物だけ）。', '出張販売の屋台は、広場の左下に移った。'])},
  {k:'wish', t:'作るリスト', c:() => true, h:() => li(['レシピ帳で、レシピの右の☆を押すと「作るリスト」に入る（もう一度押すと外れる）。何品でも入れられる。', 'レシピ帳のいちばん上に作るリスト：＋−で皿数、✕で外す。食材ごとに「手持ち/必要」、材料がそろうと「材料そろった」。', '市場の「食材」「種」では、作るリストに必要な食材に★がつき、一覧の上に並ぶ。「あと○個（必要・手持ち）」も出る。', 'かまどのレシピ帳でも☆を押せる。☆のレシピはレシピ帳のいちばん上に並ぶ。', '市場の「作るリストの足りない分をまとめて買う」で、足りない食材を一度に買える。', '作るリストに必要な作物は、農夫が空いた畑に優先して植える（種は予算内で買う）。', '作るリストに必要な数の食材は、料理人が倉庫から使わない（取り置き）。足りない分は、料理人が自分で市場から買う。自分で作るたびにリストの皿数が1減り、0で外れる。'])},
  {k:'orders', t:'依頼の掲示板', c:() => unl('orders'), h:() => li(['店の外（広場の右上）の掲示板に、料理の注文が貼られる。期限までに届けるとお金と評判。', 'まだ作ったことがない料理は、名前・調理法・材料の数・材料1つがヒントとして書いてある（残りはかまどで試して探す）。依頼に出るのは、いま手に入る材料で作れる料理だけ。', '倉庫・カバン・棚のどこにある料理でも届けられる。ただし棚に並べるとお客さんが買ってしまう。作った直後の「できあがり」画面の「📜 依頼に届ける」が確実。', '作れそうにない依頼は、1日1回「入れ替え」できる。', '宴会の予約（たくさんの皿）が入ることもある。暦にも載る。'])},
  {k:'staff', t:'従業員', c:() => unl('staff'), h:() => li(Object.values(STAFF).map(s => `<b>${s.name}</b>：${s.desc}（最大${s.max}人）`).concat([
    '従業員は働くとLvが上がり、速くなる。Lv5とLv10で得意技を1つ選べる。',
    '<b>自動仕入れの予算</b>：料理人の材料・農夫の種を市場で買う1日の上限。朝6時の所持金の20〜80%（所持金の25%は必ず残す）。',
    '<b>倉庫に残す数</b>：店員が棚に出すとき倉庫に残す皿数（0/3/5/10）。料理人はコンテスト・宴会・依頼・評論家の前に必要な料理を先に作って取っておく。'].concat(unl('training') ? ['<b>修行の旅</b>：Lv10の従業員を2日間（30,000G×回数）旅に出すと奥義を覚える（速さ+40%など）。'] : [])))},
  {k:'fish', t:'釣り', c:() => unl('fishing'), h:() => li([
    '竿を持って、農場の生簀か店の外の桟橋（右下）をタップ。「！」で合わせ → 動く針を光る帯で止める。',
    'エサや疑似餌で掛かりやすい魚が変わる。' + TACKLE.filter(t => t.bait).map(t => `${t.n}＝${t.desc}`).join('、') + '。',
    '釣れる魚は季節（旬）や天気、時間で変わる。霧と夜は珍しい魚が増える。',
    '<b>ヌシ</b>：' + Object.entries(NUSHI).map(([k, n]) => `${LOCN[k]}（${n.hint}）`).join('、') + '。'])
    + tbl(['場所', '魚'], [['生簀', nmL(POND.map(g => g.id))], ['桟橋', nmL(PIER.map(g => g.id))]].concat(unl('mine') ? [['地底湖（迷宮B21〜）', nmL(LAKE)]] : []))},
  {k:'forage', t:'採集', c:() => unl('forage'), h:() => li([
    '広場の下の道（または採集地の看板）から「採集の地図」をひらいて行き先を選ぶ。遠い場所ほど移動に時間がかかる。',
    '<b>なぞってまとめ取り</b>：指でなぞった線の上の食材をまとめて取れる（タップでも取れる）。1.3秒以内に続けて取るとコンボ：5コンボで1回+1、12コンボで+2。',
    '<b>群生</b>：光っている場所。触れると5〜8個。地図の「＊」は今日群生がある場所。',
    '<b>ごほうびの仕掛け</b>：各採集地に1日1回、1タップでまとめて取れる物がある。',
    '<b>採集Lv</b>：拾うほど上がり、取れる量・群生・珍しい物の出やすさが増える。<b>かご</b>は1回に持てる数（地図の画面で大きくできる）。',
    '同じ日に何度も行くと、2回目は6割、3回目は35%しか出ない。雨と霧はきのこ、晴れは花が多い。',
    dogJoined() ? `相棒の${S.dog.name}が、採集地で約22秒ごとに食材を拾ってくる。` : '川辺と滝にいる迷子の犬に、肉か魚か料理を3日続けてあげると……？'])
    + tbl(['採集地', '行ける条件', '取れる物', 'ごほうびの仕掛け'], BIOS.map(b => [b.n, b.cond() ? '✔' : b.lock, nmL([...new Set(b.zones.flatMap(z => bioPool(z)))].map(g => g.id)), b.gim.n + (b.gim2 ? '／' + b.gim2.n : '')]))},
  {k:'season', t:'季節・天気・行事', c:() => unl('season'), h:() => li([
    '暦は本当の暦（1か月は28〜31日）。1週間＝7日（月〜日曜）で、週ごとの行事がくり返す。季節は3か月ごと。旬の作物と魚は育ちが早く、価値が上がる。',
    '天気：' + WEATHERS.map(w => `${w.i}${w.n}${w.d ? '（' + w.d + '）' : ''}`).join('、') + '。',
    '毎週末（金〜日曜）は行事。暦タブで予定が見られる。'])
    + tbl(['月', '行事', '効果'], EVENTS.map((e, i) => [MONTHS[i], e.n, e.d]))},
  {k:'quality', t:'品質★', c:() => unl('quality'), h:() => li(['作物は水やり・肥料・旬で品質が上がる（最大★3）。品質の高い食材で作ると料理も高く売れる。', 'まれに金色の食材が取れる。金色で作った料理は価値が3倍。', '黒猫に魚をあげる・森の祠で祈ると、しばらく金色が出やすくなる。'])},
  {k:'fac', t:'施設', c:() => true, h:() => tbl(['施設', '内容'], Object.entries(FAC).filter(([k, f]) => !f.grp && (!f.gate || unl(f.gate))).map(([k, f]) => [f.name, f.desc]))},
  {k:'merchant', t:'行商人ドルン', c:() => unl('merchant'), h:() => li(['毎週火曜と土曜、10時〜22時に広場（右下）へ荷馬車で来る。珍しい食材・本・苗木を売る。', '何度も買うと「なじみ割引」が付く。' + (unl('auction') ? '土曜は競りの日。' : '')])},
  {k:'ranch', t:'牧場・果樹園', c:() => unl('ranch'), h:() => li(['鶏小屋（卵）・牛舎（牛乳）を建てると、毎日産む。えさ箱に作物を入れておく（小麦・とうもろこし・キャベツなど）。', '動物をなでると好感度が上がり、たくさん産む。', '果樹園（農場の右下）に苗木を植えると、育ったあと何度でも実る。', '養蜂箱で蜂蜜が自動で採れる。'])},
  {k:'reg', t:'常連客', c:() => unl('regulars'), h:() => li(['好きな料理を棚に並べておくと、常連客が来て仲良くなる（♥）。♥が上がると特典やお話。', '図鑑の「常連」タブで好みと仲の良さがわかる。'])},
  {k:'mach', t:'加工器具', c:() => unl('machines'), h:() => li(['キッチンの左右の壁ぎわに置く。予約しておけば留守中も動き、完成品は倉庫へ。強化すると速く、作れる物が増える。', '<b>市場で買うより、自分で作った方が必ず安い</b>（加工器具の画面に、市場の値段と自作の値段が出る）。'])
    + MACH.filter(m => m.slot[0] !== 'W' || S.fac.workshop).map(m => `<div class="p" style="margin-top:3px"><b>${m.name}</b>（${fmt(m.price)}G）</div>` + tbl(['作る物', '材料', '時間'], m.recipes.map(r => [ingName(r.out) + '×' + r.n + (r.lv > 1 ? `（Lv${r.lv}）` : ''), r.ins.map(ingName).join('＋'), Math.round(r.sec / 60) + '分']))).join('')},
  {k:'breed', t:'品種改良', c:() => unl('breed'), h:() => li(['農場の道具小屋の交配台で、2つの種を掛け合わせると新しい作物ができる。', '組み合わせは図鑑で確かめられる。Lvで同時に交配できる数と速さが上がる。'])},
  {k:'mine', t:'地下迷宮', c:() => unl('mine'), h:() => li(['深い層の岩からも、石炭（どこでも多め）とそれまでの層の鉱石がときどき出る。', '一度掘った鉱石は、鍛冶屋で買うこともできる（掘るより高め、石炭はいつでも）。採掘人には「頼む鉱石」を指定できる（従業員タブ）。', 
    '店の外の古井戸から入る。ツルハシと剣は市場の「道具」。5階ごとに昇降機があり、次からそこから始められる。',
    '<b>岩はタップすると、そこへ行ってすぐ壊せる</b>（気力を使う。硬い岩は上のツルハシが必要）。壊していると階段が見つかる。',
    '魔物はタップで攻撃。体力が0になると、その回に取った物を半分なくして外へ。料理を食べると回復（持ち物の料理をタップ）。辛い料理は攻撃↑、酸っぱい料理は防御↑。',
    '新しい層（B11・B21…）に初めて着くと最大体力+15。鍛冶屋ガルドで防具を作るとダメージが減る。',
    '鉱石は鍛冶屋で道具・防具・器の材料に。市場の「買取」で売れる。博物館（鍛冶屋の寄贈）で集めるとごほうび。'])
    + tbl(['階', '層', '鉱石', '魔物'], LAYERS.map((L, i) => [`B${i * 10 + 1}〜${i * 10 + 10}`, L.n, nmL(Object.keys(L.rocks).filter(k => k !== 'stone')), L.mons.map(k => MONT[k].n).join('・')]))},
  {k:'story', t:'宵闇亭の秘密（日記）', c:() => unl('story'), h:() => li(['先代の店主マルタの日記が12ページ。迷宮の深い階・釣り・採集・住民との会話などで見つかる。', '図鑑の「日記」タブで読み返せる。次のページの手がかりも書いてある。'])},
  {k:'stall', t:'出張販売（夜市）', c:() => unl('stall'), h:() => li(['18時〜翌2時、広場の左の屋台から。料理を選んで持っていき、来たお客の注文に合う料理を素早く出す。', '棚に並べた料理も持っていける。屋台は施設タブで強化できる。'])},
  {k:'contest', t:'料理コンテスト・料理決闘', c:() => unl('contest'), h:() => li(['毎週木〜日曜に開催。週の初め（月曜）にテーマ（甘い料理など）が発表される。テーマに合う、価値の高い料理を出すと勝ちやすい。', '料理人はコンテストの前に、テーマに合う料理を先に作って取っておく。', '広場の泉で料理決闘（カード勝負）ができる。初めて挑むときは立会人ボルドの<b>練習試合</b>でルールを1つずつ教わる（決闘の画面からいつでもやり直せる）。', '<b>料理決闘</b>：覚えたレシピがカードになる。毎ターン🔥3つ。使う火の数は材料の数（1〜2つ＝🔥1、3つ＝🔥2、4つ以上＝🔥3）。旨み＝評価、甘み＝守り、辛み＝辛さ、酸味＝引く、苦み＝弱気。調理法のおまけ：焼く 評価+2／煮る 守り+3／揚げる 評価×1.3／蒸す 回復／生 引く+1／炊く 次の火+1。5人勝ち抜き（5人目は井戸底の料理長ザハル）。'])},
  {k:'monster', t:'魔物料理', c:() => unl('monster'), h:() => li(['迷宮の魔物が専用の素材を落とす（肝・手羽・核・卵・墨・心臓など）。', '魔物の素材を使った料理には「魔」の印。深夜の客の大好物。レシピは市場の本『魔物料理帖』。'])
    + tbl(['魔物', '落とす素材'], Object.entries(MPART).map(([k, p]) => [MONT[k].n, nmK(p[0])]))},
  {k:'critic', t:'料理評論家', c:() => unl('critic'), h:() => li(['ときどき来店し、棚でいちばん価値の高い料理を食べて★1〜5で評価する（暦に来店予定が出る）。', '★を増やすには：品質★、適正以下の値段、棚の器、熟練度★3、旬の食材。記事に足りない点が書いてある。', '棚が空なら倉庫の料理を食べていく。'])},
  {k:'decor', t:'内装・衣装', c:() => unl('decor'), h:() => li(['施設タブの「内装を変える」で、床・テーブル・照明・飾りを選べる。テーマをそろえると評判が上がりやすい。', '「衣装」タブで店主の衣装と従業員の制服を買える。色が変わり、小さな効果がある。'])
    + tbl(['衣装', '値段', '効果'], OUTFITS.filter(o => o.c).map(o => [o.n, o.c > 0 ? fmt(o.c) + 'G' : o.src, o.d]).concat(UNIFORMS.filter(u => u.c).map(u => [u.n + '（制服）', fmt(u.c) + 'G', u.d])))},
  {k:'night', t:'裏営業（深夜の客）', c:() => unl('night'), h:() => li(['21時〜1時50分、店内の画面上「🌙裏営業」で始める（1晩1回）。眠ると終わる。', '幽霊や魔族の客が、棚と倉庫の料理を食べる。魔物料理・夜の食材の料理を好み、昼より高く払う。', 'ときどき幽霊の涙・月の雫・魂花・冥府の香草を置いていく（本『夜の献立帖』で使う）。'].concat(unl('dice') ? ['裏営業の間は「🎲サイコロ」で魔族の紳士と丁半勝負ができる（1晩10回）。'] : []))},
  {k:'expand', t:'店の拡張', c:() => unl('expand'), h:() => tbl(['拡張', '内容', '最大'], Object.entries(FAC).filter(([k, f]) => f.grp === 'ext' && !(f.gate && !unl(f.gate))).map(([k, f]) => [f.name, f.desc, 'Lv' + f.max]))},
  {k:'town', t:'町への投資', c:() => unl('town'), h:() => tbl(['投資', '値段', '効果'], TOWN.map(t => [t.n + (townN(t.id) ? ' ✔' : ''), fmt(t.c) + 'G', t.d]))},
  {k:'airec', t:'オリジナルレシピ（試作台）', c:() => unl('airec'), h:() => li(['かまどの「🧪試作台」で、食材（6つまで）と調理法を選んで味見する。料理長がひとことアドバイスと完成度を返す（最大5回、食材は減らない）。', '<b>仕上げ</b>：味付け（塩・しょうゆ・みそ・甘辛・ソース・スパイス・ハーブ・レモン・ごま・バター・はちみつ）で味が変わる。盛り付け（華やか・上品・重箱など）で値打ちが最大+5%。ジャンル（和・洋・中・エスニック・お菓子・パン）で相性と名前の付き方が変わる。', '<b>ひとことで注文</b>：「寒い夜に温まる辛いスープ」のように書いて「頼む」と、料理長が手元の食材で材料・調理法・仕上げを組み立てる。<b>💡材料を聞く</b>：足すと良い食材が光る（どちらも1回の試作で合わせて4回まで）。', '「これで完成にする」で名前と説明を付けると、オリジナルレシピ図鑑に登録される。1日3品まで。'])},
  {k:'money', t:'運だめし・投資', c:() => unl('lottery'), h:() => li(['<b>福引き</b>：広場の泉の左下の露店。1回500G。金の玉で8,000G＋限定衣装。', '<b>週の宝くじ</b>：1枚500G・週10枚まで。毎週日曜の夜に発表。1等100,000G。']
    .concat(unl('auction') ? ['<b>行商人の競り</b>：週1回。ライバル3人（目安の0.65〜1.45倍の値）と入札し、一番高ければ「2番目の値段＋100G」で買える。掲示板か荷馬車から週のいつでも入札を預けられ、土曜10時に自動で競る（負ければ全額戻る）。画面に勝てる見込み（%）が出る。'] : [])
    .concat(unl('branch') ? ['<b>となり町の支店</b>：施設タブ。1時間ごとに売上が届く（放置中も）。'] : [])
    .concat(unl('trade') ? ['<b>食材の相場</b>：市場の「相場」タブ。高級食材の値段が毎日上下する。安い日に買って高い日に売る。'] : []))},
  {k:'expedition', t:'遠征（港町シオカゼ）', c:() => unl('expedition'), h:() => li([
    '目標「決闘の塔で10階まで登ろう」で解放。採集の地図の「遠征の地図」から馬車で出発。行きも帰りも1日（次の日の朝10時に着く）。留守のあいだは従業員が店を回す。',
    '町は全部で5つ（港町シオカゼ → 砂の町サハラン → 茶の里ミドリ → 雪の王都シルヴァ → 南の果実島ルルア）。前の町の評判Lv3の目標で次の町への道が開く。町から町へも1日。',
    '<b>町の評判</b>：Lv2＝300・Lv3＝1,000・Lv4＝2,500・Lv5＝5,000。屋台の売上20Gごとに1、交易所の売上15Gごとに1、レシピを教わると60。Lv4で市場1割引、Lv5で2割引。',
    '<b>市場</b>（屋台4つ）：魚屋＝マグロ・タコ・イカ／Lv2 伊勢エビ／Lv3 本マグロの大トロ。香辛料屋＝黒胡椒／Lv2 シナモン／Lv3 サフラン。青物屋＝オリーブ・オリーブ油・レモン・海ぶどう。乾物と瓶詰め屋＝海ぶどう・昆布／Lv2 からすみ・ホタテ。値段は価値の1.3倍。',
    '<b>自分の屋台</b>：料理を売る。魚介の料理×1.35、港の料理×1.6、ほかは×0.9、評判1Lvごと+5%。1日20皿＋評判1Lvごと10皿。',
    '<b>交易所</b>：毎日3つの「求む」品を2.5倍（Lv3から3倍）、1品1日5個まで。',
    '<b>港の食堂</b>：レシピ12品を教わる（値段は料理の価値×25G）。Lv1・2・3で4品ずつ。',
    '<b>宿屋「潮騒」</b>：一晩300Gで朝6時まで眠る。深夜2時を過ぎて倒れても宿で目を覚ます。'])},
  {k:'desert', t:'遠征（砂の町サハラン）', c:() => unl('desert'), h:() => li([
    '目標「港町シオカゼの評判をLv3にしよう」で解放。遠征の地図から馬車で1日。評判・宿屋・交易所・食堂のしくみはシオカゼと同じ。',
    '<b>市場</b>：香辛料屋＝クミン・ターメリック・黒胡椒／Lv2 シナモン／Lv3 サフラン。なつめやしと木の実の店＝なつめやし・ザクロ／Lv2 ピスタチオ。豆と穀物の店＝ひよこ豆・クスクス粒・オリーブ油・ヨーグルト。香草とランプの店＝ミント・茶葉／Lv2 ローズ水。',
    '<b>自分の屋台</b>：香辛料を使う料理と甘い菓子×1.35、砂の町の料理×1.6、ほかは×0.9。<b>夜のバザール</b>（17時〜深夜2時）は値段×1.3、1日に売れる数も1.5倍。',
    '<b>キャラバン宿（交易所）</b>：砂漠では珍しい海の物・森の物・シオカゼの品などを「求む」で高く買う。',
    '<b>ドームの食堂</b>：レシピ12品（タジン鍋・クスクス・ファラフェル・フムス・シシケバブ・バクラヴァ・ミントティーなど）。Lv1・2・3で4品ずつ。',
    '<b>宿屋「砂の月」</b>：一晩300G。'])},
  {k:'secrets', t:'宝の地図・隠し部屋・満月・石碑・冒険の仲間', c:() => unl('tmap'), h:() => li([
    '<b>宝の地図</b>（目標「使い魔をLv15」で解放）：釣り1.5%・魔物0.5%・採集0.3%・隠し部屋35%・満月の夜店。行ける採集地か町のどこかに×印。掘るとお金（8,000〜20,000G×深さ）・宝石・薬・卵・装備、まれに伝説の食材。',
    ...(unl('secret') ? ['<b>隠し部屋</b>（目標「宝の地図の宝」で解放）：迷宮・ダンジョンの階の7%（盗賊の仲間で2倍）にひび割れた壁。大きな宝箱（お金・宝石・装備60%・卵40%・高級な薬50%・宝の地図35%）。'] : []),
    ...(unl('moon') ? ['<b>満月の夜</b>（目標「隠し部屋」で解放）：毎週木曜の19時〜朝5時。月の兎の夜店：' + MOON_SHOP.map(x => `${x[1]}${fmt(x[2])}G`).join('・') + '（各1つ）。迷宮に月光スライム。なつく確率2倍。'] : []),
    ...(unl('stele') ? ['<b>石碑と封印の扉</b>：5つの町の広場の石碑で紋を写す → 地下迷宮B1の封印の扉 → <b>古の厨房</b>。古の料理帖（5品）と、料理の値打ち+5%（ずっと）。星の器の棚から1日1回、珍しい食材。'] : []),
    ...(unl('comp') ? ['<b>冒険の仲間</b>（目標「ギルドランクS」で解放）：' + CP_KEYS.map(k => `${CPD[k].n}（${CPD[k].role}）＝${CPD[k].skill(0)}／♥5：${CPD[k].skill(5)}。依頼：${CPD[k].q}。好物：${CPD[k].favT}`).join('<br>')] : [])])},
  {k:'mranch', t:'魔物牧場・使い魔・薬草と調合', c:() => unl('mranch'), h:() => li([
    '目標「魔物図鑑で★1の魔物を8種類にしよう」で解放。店の外の「冒険者ギルドへ」の道しるべから「魔物牧場と薬草園」へ。',
    '<b>仲間にする</b>：図鑑★1以上の魔物を倒すと0.5%でなつく（なつかせの香で3倍、呪いでも少し上がる。色違い2%）。<b>卵</b>：魔物0.4%・宝箱12%で、その場所の卵（' + ING.filter(g => g.src[0] === 'mregg' && g.id !== 'egg_mix').map(g => g.name).join('・') + '）。孵化小屋で1日、色違い3%。',
    '<b>牧場</b>：飼える数 6・12・18・24（強化 ' + MR_UP.slice(1).map(fmt).join('・') + 'G）。えさ箱の作物・採集物を毎朝1体1つ食べて素材を1つ（なつき♥4以上と進化で増える）。<b>手伝い</b>（3体まで）：火の魔物＝かまど番（値打ち+3%）、土の魔物＝畑番（作物の育ち+6%）、氷・空の魔物＝呼び込み（客足+4%）。',
    ...(unl('familiar') ? ['<b>使い魔</b>（目標「牧場で魔物を3体」で解放）：1体を連れて行く。攻撃＝(4＋Lv×1.6)×進化（上位1.5・王2.2）。倒した魔物で経験。Lv15上位・Lv30王・最大Lv40。'] : []),
    ...(unl('herb') ? ['<b>薬草と調合</b>（目標「使い魔をLv5」で解放）：薬草8種（' + HERB_IDS.map(ingName).join('・') + '）。薬30種：' + POT_IDS.map(id => `${ingName(id)}（${POTD[id].d}）`).join('・')] : []),
    ...(unl('mbreed') ? ['<b>掛け合わせ</b>（目標「薬を5本」で解放）：Lv5以上の2体・5,000G・1体1日1回。新種8種：' + Object.values(HYB_N).join('・') + '。色違い6%。'] : [])])},
  {k:'museum', t:'博物館・王国の復興帳・完全攻略率', c:() => unl('museum'), h:() => li([
    '目標「魔物牧場で魔物を6体育てよう」で解放。店の外の道しるべから「博物館」へ。',
    '<b>展示室</b>：' + Object.keys(MU_WINGS).map(w => `${MU_WINGS[w]}（${muCount(w)}/${muList(w).length}）`).join('・') + '。食材・魚・ボスの戦利品・鉱石は1つ寄贈（なくなる）。魔物の標本は図鑑★1で、伝説・ボスの武器は持っているだけで飾れる（なくならない）。展示室ごとに10点でお礼（10点×1万G、20点で2万G…）。',
    '<b>完全攻略率</b>：レシピ・食材・魔物・装備・実績・博物館・復興・牧場の8つの集まり具合の平均。図鑑の一番上と館長で見られる。25%で5万G・50%で20万G・75%で50万G。<b>100%</b>：宵闇亭が金色（料理の値打ち+10%）・黄金の鍋（料理がいつも品質★3）・黄金像・称号「すべてを知る者」・100万G。',
    ...(unl('restore') ? ['<b>王国の復興帳</b>（目標「博物館に20点」で解放）：道しるべから旧市街へ。' + RS_KEYS.map(k => `${RS[k].n}（${RS[k].fx}）`).join('・') + '。王城の門はほかの7つを建てたあと。'] : [])]) },
  {k:'dungeon', t:'専用ダンジョン・ボス・呪いの迷宮', c:() => unl('dungeon'), h:() => li(['<b>薬</b>：専用ダンジョンが開くと、市場の「道具」で回復薬・上級回復薬・気つけ薬を買える（値打ちの3倍。魔物牧場の調合小屋で作るほうが安い）。迷宮では画面上の「🧪薬」から使う。', 
    '目標「冒険者ギルドのランクをCにしよう」で解放。遠征先の町で、馬車の「遠征の地図」から「⚔専用ダンジョン」。ギルドの転移陣（ランクS〜）からも直接行ける。',
    ...DG_KEYS.map(k => `<b>${DGD[k].n}</b>（${TOWNC[DGD[k].town].n}）：魔物 ${DGD[k].mons.map(x => MONT[x].n).join('・')}／ボス ${MONT[DGD[k].boss].n}／素材 ${[...DGD[k].mats, DGD[k].bm].map(ingName).join('・')}`),
    '全10階＋最奥のボスの間。6階まで行くと次から6階から入れる。一度ボスを倒すと、ボスの間へ直行できる。',
    '<b>ボス戦</b>：大技の前に赤い範囲で予告（そこから出れば当たらない）。体力3割で怒って大技が速く多く。ときどき手下を呼ぶ。',
    '<b>ボスのごほうび</b>：週に1回は全部（賞金・ギルドポイント・ボスの素材×3・伝説の武器35%・ボスの指輪25%）、ほかの回は少なめ。初めて倒すと伝説の武器が必ず出て、料理帖4品を覚える。<b>ボスの武器は効果が3つ</b>（35%で4つ、さらに10%で5つ）。ボスの指輪は、専用ダンジョンと呪いの迷宮で攻撃・守り+10%。',
    ...(unl('curse') ? ['<b>呪いの石像</b>（目標「専用ダンジョンのボスを倒そう」で解放）：迷宮と専用ダンジョンの入口で段階1〜5を選ぶ。供え物 2,000G×段階²。魔物の体力+40%・攻撃+25%・数が増える／段階ごとに落とし物・宝箱のお金・装備の確率+50%、レア度アップ、ボスの賞金+50%。'] : [])])},
  {k:'caravan', t:'交易キャラバンと伝説の食材', c:() => unl('caravan'), h:() => li([
    '目標「砂の町サハランの評判をLv2にしよう」で解放。遠征の地図の「🐫交易キャラバン」から。',
    '<b>荷馬車</b>：最大5台（' + CARA_BUY.map(fmt).join('・') + 'G）。道（町A⇔町B）を決めて出発すると、行き帰りをずっと繰り返す。片道は町の距離で1〜4日（車輪で短く）。',
    '<b>荷</b>：1箱＝10個。出発の町で買い（所持金の半分まで）、着いた町で売る。地元の品は安く（価値の0.72〜0.94倍）、ほかの町では高く売れる（1.25〜1.8倍、地元では0.8倍）。毎日変わる。おまかせ＝いちばんもうかる荷。',
    '<b>危険</b>：盗賊（10%、3〜6割うばわれる）・嵐（8%、1日遅れ。南の島への船旅は1.5倍）。護衛（荷の代金の4%、盗賊×0.35）と護衛隊の強化（最大65%）で防ぐ。荷台は10〜48箱、強化は15,000G×Lv²。',
    '<b>伝説の食材</b>12種：' + Object.keys(LEG).map(id => `${ingName(id)}（${LEG_HINT[LEG[id]]}）`).join('・') + '。手に入ると究極のレシピを覚える。',
    '<b>究極の料理</b>：値打ち3倍・迷宮で食べると5分間 攻撃×1.5・受けるダメージ×0.7・体力回復・王宮の褒美3倍・料理決闘のカード2倍。初めて作ると永久の強化（' + ULT_PERM.map(x => x[2]).join('・') + '）。12品で称号「究極の料理人」と100万G。'])},
  {k:'arms', t:'武器と装備', c:() => unl('arms'), h:() => li([
    '目標「冒険者ギルドのランクをEにしよう」で解放（それまでは片手剣だけ）。カバンの画面の「⚔装備」で、武器1・指輪2・首飾り1。',
    ...Object.keys(WT_N).map(t => `<b>${WT_N[t]}</b>：` + Object.values(WSUB).filter(x => x.type === t).map(x => `${x.n}＝${x.d}`).join('／')),
    '<b>攻撃</b>＝(2＋段階×3)×型の倍率×レア度（並1・良1.1・希少1.2・英雄1.35・伝説1.5）×鍛え直し。会心は基本5%で2倍。',
    '<b>手に入れ方</b>：鍛冶屋の「武器を作る」（銅・鉄・金・サファイア・ダイヤ・冥鉄・夜晶・星喰い鉱・奈落晶と石炭）／迷宮の魔物（1.2%）と宝箱（35%、奈落の深層は50%）／遠征の町の交易所の「武器屋」／ギルドの交換所（ランクで増える）／昇格試験の合格（C・A・S・SS・SSSなど）／伝説の装備は奈落の深層B100より深い所でごくまれ。',
    '<b>付与</b>（鍛冶屋）：空き枠に宝石2個とお金。ルビー＝炎・サファイア＝冷気・エメラルド＝毒・アメジスト＝吸血・ダイヤ＝会心・月長石＝落とし物・冥鉄＝攻撃・夜晶＝速さ・星喰い鉱＝なぎ払い・奈落晶＝守り。',
    '<b>指輪・首飾り</b>：' + ACC.map(a => `${a.name}（${a.desc}）`).join('・'),
    '図鑑の「装備」タブで集めた種類が見られる。25種ごとにごほうび。'])},
  {k:'guild', t:'冒険者ギルド', c:() => unl('guild'), h:() => li([
    '目標「魔物を30体倒そう」で解放。店の外の広場の左の道しるべから行ける。',
    '<b>依頼</b>（左の掲示板）：毎日3件と週に1件。討伐（魔物を○体）・素材集め（採掘・採集・釣りの物を納める）・料理の納品・踏破（迷宮の○階まで行く）。達成したら掲示板で報告すると、お金とギルドポイント。',
    '<b>ランク</b>：F→E→D→C→B→A→S→SS→SSS。ギルドポイントが ' + GUILD_TH.slice(1).map((t, i) => GUILD_RN[i + 1] + '＝' + t).join('・') + ' に届くと、受付で昇格試験を受けられる。',
    '<b>昇格試験</b>：指定の階より深い所に、赤いオーラの<b>試験官</b>（体力5倍・攻撃1.4倍）が現れる。倒すと合格。賞金つき。',
    '<b>ギルドの建物</b>：ランクで5段階に大きくなる（D＝木組みの2階建て、B＝石造りと訓練場、S＝両翼の塔と酒場、SS＝鐘の塔・宝物庫・転移陣）。訓練場・酒場・宝物庫・転移陣の使い道は今後の更新で増える。',
    '<b>魔物図鑑</b>（図鑑の「魔物」タブ）：倒した数・落とす物・すむ場所。10・100・1,000体で★1〜3。★1つごとにその魔物への攻撃+10%、落とし物の確率+25%。'])},
  {k:'tea', t:'遠征（茶の里ミドリ）', c:() => unl('tea'), h:() => li([
    '目標「砂の町サハランの評判をLv3にしよう」で解放。しくみ（市場・屋台・交易所・食堂・宿・評判）はほかの町と同じ。',
    '<b>市場</b>：茶問屋＝茶葉・玉露／Lv2 抹茶。和菓子の材料屋＝小豆・もち米・黒蜜／Lv2 葛粉。薬味と山の幸＝柚子・山椒・しいたけ／Lv2 たけのこ。川魚屋＝ニジマス・サケ／Lv2 ウナギ。',
    '<b>自分の屋台</b>：茶や和菓子の材料（茶葉・抹茶・玉露・小豆・もち米・黒蜜・葛粉・柚子・山椒）を使う料理と蒸し料理×1.35、茶の里の料理×1.6。',
    '<b>野点の茶会</b>（右の東屋）：1日1回、2品×2皿の注文。お礼＝料理の値打ち×2皿×(3＋評判Lv×0.25)、評判+80。',
    '<b>茶屋「みどり」</b>：葛餅・おはぎ・柚子胡椒の焼き鳥・うなぎ飯・茶碗蒸し・ぜんざい・かき氷・ロールケーキ・茶漬け・麻婆豆腐・抹茶そば・懐石膳の12品。'])},
  {k:'capital', t:'遠征（雪の王都シルヴァ）', c:() => unl('capital'), h:() => li([
    '目標「茶の里ミドリの評判をLv3にしよう」で解放。',
    '<b>市場</b>：狩人の肉屋＝鹿肉・鴨肉・ソーセージ／Lv2 ハム。王都の八百屋＝ビーツ・じゃがいも・コケモモ／Lv2 ポルチーニ。魚と瓶詰めの店＝ニシン・サワークリーム・サケ／Lv3 キャビア。パンと酒の店＝ライ麦・チーズ・バター／Lv2 ブランデー／Lv3 トリュフ。',
    '<b>自分の屋台</b>：煮る料理×1.35、王都の料理×1.6。',
    '<b>王宮への献上</b>（右の赤い台）：1日1皿。褒美＝料理の値打ち×(8＋評判Lv)、金色は×1.5。評判+100。',
    '<b>王都の食堂</b>：ボルシチ・ライ麦サンド・鹿肉のロースト・ポルチーニのスープとリゾット・ニシンの酢漬け・ペリメニ・コケモモのパイ・ブランデーケーキ・鹿肉の煮込み・ブリヌイ・王宮の晩餐の12品。'])},
  {k:'isle', t:'遠征（南の果実島ルルア）', c:() => unl('isle'), h:() => li([
    '目標「雪の王都シルヴァの評判をLv3にしよう」で解放。行き帰りは船で1日。',
    '<b>市場</b>：果物屋＝マンゴー・パイナップル・バナナ・パパイヤ／Lv2 パッションフルーツ。浜の魚屋＝エビ・イカ・マグロ／Lv2 ロブスター。椰子とカカオの店＝ココナッツ／Lv2 カカオ／Lv3 バニラ。南の香草屋＝ライム・唐辛子・しょうが／Lv3 ドラゴンフルーツ。',
    '<b>自分の屋台</b>：果物を使う料理×1.35、島の料理×1.6。',
    '<b>島の果樹</b>（右の大きな木）：1日1回、果物を3＋評判Lv個（ときどきカカオ）。',
    '<b>浜の食堂</b>：マンゴープリン・パイナップルの焼き飯・ロブスターのライム焼き・フルーツ盛り・バナナのフリッター・ココナッツカレー・イカのライムマリネ・パッションフルーツのタルト・ホットチョコ・青パパイヤのサラダ・ロブスターのココナッツ煮・ルルアの大祝宴の12品。'])},
  {k:'tower', t:'決闘の塔', c:() => unl('tower'), h:() => li([
    '目標「料理を1つ「極」にしよう」で解放。泉の料理決闘の画面の「決闘の塔へ」から。町の空に塔が見えるようになる。',
    '1階ごとに1人と料理決闘（デッキは料理決闘で組んだもの）。勝つと上の階へ、上限なし。相手は1階ごとに5%ずつ強くなる。10階ごとに「階の主」（気力×1.7）。',
    '間の色：1〜10階 石／11〜20 銅／21〜30 銀／31〜40 金／41階〜 黒曜。',
    '気力は持ち越し。勝つたびにカードを1枚もらうか休む（30%回復）。5階ごとに全回復。<b>負けたら1階から</b>。途中で降りても記録は残る。',
    '勝つたびに塔のメダル（1枚、階の主+5、20階ごとに+1）と賞金（60×階×(1＋階/25)G）。階の主は珍しい食材も。',
    '<b>塔の厨房</b>：同じ料理を5皿捧げるとカードが鍛えられる（★1＝5、★2＝10、★3＝15、10ごとに＋1）。＋1ごとに評価と守り+15%、＋3ごとに辛さ+1。上限なし。',
    '<b>塔の交換所</b>：トリュフ3・キャビア3・サフラン×2 3・月光エキス5・奈落晶6・不死鳥の卵8・レシピ4品（10〜40）・衣装「塔の覇者の外套」60（塔で気力+10）。'])},
  {k:'abyss', t:'奈落の深層（B51〜）', c:() => unl('abyss'), h:() => li([
    '目標「支店をLv3にしよう」で解放。地下迷宮のB51から先が、どこまでも続く「奈落の深層」になる。',
    '降りるたびに6種類の階のどれかになる（5の倍数の階は昇降機のある「深層」）：' + DEEP_V.map(v => `<b>${DEEP_VN[v]}</b>＝${DEEP_VD[v]}`).join('／'),
    '魔物の強さは10階ごとに×1.12（B300より深い所は×1.05）。B61・B71…に初めて着くたびに最大体力+10。',
    '<b>深さの記録</b>：B101より深く、新しく10階進むたびに、ずっと 攻撃×1.03・受けるダメージ÷1.03（迷宮・ダンジョン・闘技場のすべてで）。',
    '掘れる鉱石：ダイヤ・月長石・冥鉄・夜晶・星喰鉱・<b>奈落晶</b>（星喰以上のツルハシ）。奈落晶は魔物や宝箱からも出る。',
    '深層の食材：奈落茸・古都麦・冥府の根（地底の庭）、霧の実（毒霧の階）、星屑塩（鉱脈の階の岩・ほかの階でも少し）、深層獣の肉（魔物、とくに魔物の巣）。本『奈落の深層料理帖』（8,000G）に8品。',
    '<b>鍛え直し</b>（鍛冶屋ガルド）：奈落晶（2＋段階）と20,000G×(段階＋1)で、剣は攻撃+12%ずつ、防具は受けるダメージ÷(1＋0.1×段階)。上限なし。',
    '実績：B100・B200・B300、剣＋10。'])},
  {k:'fame', t:'名声レベル', c:() => unl('fame'), h:() => li([
    '目標「店の格を伝説の宵闇亭にしよう」で解放。画面上の店の格のところが「名声Lv」になり、タップすると詳しく見られる。',
    '売上100Gごとに名声が（0.5＋評判/100）貯まる。次のLvに必要な名声は 1,000×Lv^1.4。<b>上限なし</b>。',
    '効果：料理の価値がLv50まで1Lvごと+0.4%、その先は+0.1%ずつ上がる（店・出張販売・コンテストなどすべて）。',
    '5Lvごとに町から贈り物（2,000G×Lv＋珍しい食材）。Lv10「町の誇り」・25「王都にも届く名」・50「大陸一の料理屋」・100「永遠の宵闇亭」で称号。'])},
  {k:'kiwami', t:'料理の極み', c:() => unl('kiwami'), h:() => li([
    '目標「名声をLv5にしよう」で解放。料理ごとに、作った数（熟練度）が★5（60皿）の先へ伸びていく。',
    '<b>「極」</b>150皿・「極・弐」400皿・「極・参」800皿・「極・肆」1,500皿・「極・伍」2,500皿、その先は1,500皿ごとに「極・6」「極・7」…と上限なし。',
    '段階ごとにその料理の価値 +5%。従業員の料理人が作った分も数に入る。',
    '図鑑の「極み」タブ：30皿以上作った料理の進み具合。極めた料理の数が1・3・5・10・20・30・50・75・100品（その先は50品ごと）でごほうび（3,000G×品数、5品からは月光エキスも）。'])},
  {k:'cellar', t:'地下貯蔵庫と熟成', c:() => unl('cellar'), h:() => li([
    '「2階の客席を作ろう」の目標で解放。「施設」→「店の拡張」で建てる（Lv1 15,000G・鉄×6／Lv2 45,000G・銀×4・金×2／Lv3 120,000G・エメラルド×2）。熟成台は 6／10／16台。',
    '厨房の真ん中の<b>床扉</b>から降りる。熟成台をタップして、同じ食材を最大10個寝かせる。',
    '約1日で品質★が1つ上がる。★3になってから、さらに食材ごとの日数を寝かせると<b>熟成品</b>（★★★）になる。熟成はゲームの時間で進む（眠っている間・放置中も）。',
    '途中で取り出すと、その時点の品質★のもとの食材に戻る。完成すると知らせが出て、熟成台が光る。2台以上完成していれば、まとめて取り出せる。',
    '本『熟成の手帖』（市場・3,000G）に熟成品を使うレシピ12品。'
  ]) + tbl(['寝かせる物', '熟成品', '★3から'], Object.entries(AGE).map(([id, a]) => [nmK(id), nmK(a.to) + '（' + ING[INGI[a.to]].value + 'G）', a.d + '日']))},
  {k:'rival', t:'ライバル店「白昼亭」', c:() => unl('rival'), h:() => li([
    '「修行の旅」の目標を達成すると、宵闇亭の右隣に白昼亭が建つ。開店は次の週の月曜から。店主はヒナタ。',
    '毎週（月〜日曜）の<b>お題</b>で勝負。日曜が終わったとき（0時）に結果発表。最初の週のお題は<b>売上</b>（店・出張販売・裏営業・宴会・依頼などすべて）。',
    '2週目からのお題（毎週変わる）：売上／売った皿数／魚介の料理の売上／甘い料理の売上／魔物料理の売上／売れた料理の種類。皿数・種類は店・出張販売・裏営業で売れた分。',
    '白昼亭の目標は週の初めに決まる：これまでの週のあなたの同じ数値の平均（ならし）×倍率（魚介・甘い・魔物＝1.15＋0.05×勝ち数、皿数・種類＝1.05＋0.02×勝ち数、売上＝1.02＋0.02×勝ち数）。負けが続くと、1敗ごとに目標が8%ずつ下がる（勝つと元に戻る）。<b>お題に合う料理を多く並べれば上回れる</b>。',
    '白昼亭をタップすると、今週の売上の比べ（白昼亭は日がたつにつれて増える）と残り日数、これまでの勝負が見られる。暦にも結果発表の日が載る。',
    '勝つと賞金（白昼亭の売上の約8%、最低5,000G）と評判。負けても失う物はない。',
    '<b>3回勝つと提携</b>：毎朝、白昼亭から売上の分け前（白昼亭の1日の売上の約12%）と、珍しい食材（サフラン・トリュフ・キャビア・バニラ・ドラゴンフルーツのどれか）が1つ届く。',
    '白昼亭は朝8時〜夕方6時の営業。夜は閉まっている（提携後は看板が太陽と月になる）。'])},
  {k:'ach', t:'実績と称号', c:() => unl('ach'), h:() => li([
    '料理を作った数・売った数・売上・レシピ数・釣り・採集・地下迷宮・日記・評論家・コンテストなどの記録で、実績が' + ACH.length + '種類ある。',
    '達成するとすぐにごほうびのお金が入り、同じ名前の<b>称号</b>が手に入る。',
    '称号は「図鑑」→「実績」タブでタップして選ぶ。画面上の店の格の表示と交互に表示される。「外す」で非表示。',
    'まだ達成していない実績は称号の名前が「？？？」になっている（条件は見える）。'])},
  {k:'xfer', t:'データの引き継ぎ', c:() => true, h:() => li([
    '「施設」タブのいちばん下、「データの引き継ぎ」から。',
    '<b>コードを作る</b>：今のデータを「NK1:」で始まる文字のコードにする。「コピーする」でコピーして、メモやメッセージに貼って保存しておく。',
    '<b>コードで読み込む</b>：別の端末でコードを貼りつけて「読み込む」を2回押す。所持金と月が表示されるので、正しいデータか確かめてから。',
    'コードは作った時点のデータ。その後に遊んだ分は入らないので、端末を移るときは直前に作り直す。',
    '読み込んだ端末の今のデータは上書きされて消える。'])},
  {k:'src', t:'食材の入手先一覧', c:() => true, h:() => {
    const groups = {}; for (const g of ING) { if (g.src[0] === 'nushi' || g.src[0] === 'item') continue; const k = srcText(g).replace(/（.*?）/g, '').split('・')[0] || 'その他'; (groups[k] = groups[k] || []).push(g); }
    return `<div class="p">まだ見つけていない物は、数だけ表示される。</div>` + tbl(['手に入る場所', '食材'], Object.entries(groups).map(([k, gs]) => [k, nmL(gs.map(g => g.id))]));
  }},
];
let manSel = 'flow';
const MAN_CAT = [['基本', ['flow', 'ctrl', 'res', 'cook', 'wish', 'forgehut', 'shop', 'orders', 'fac', 'xfer', 'src']], ['店', ['staff', 'reg', 'critic', 'decor', 'night', 'expand', 'town', 'money', 'contest', 'cellar', 'rival', 'fame', 'kiwami', 'airec', 'stall', 'merchant']],
  ['農・釣り', ['farm', 'soil', 'hill', 'ranch', 'mach', 'brewer', 'breed', 'fish', 'fishmk', 'forage', 'season', 'quality']], ['冒険', ['shugyo', 'mine', 'plgrow', 'scroll', 'works', 'tavern', 'monster', 'story', 'guild', 'arms', 'dungeon', 'secrets', 'abyss', 'tower']],
  ['町・遠征', ['expedition', 'desert', 'tea', 'capital', 'isle', 'caravan', 'mirror']], ['やり込み', []]];
const manCatOf = k => (MAN_CAT.find(c => c[1].includes(k)) || MAN_CAT[MAN_CAT.length - 1])[0];
let manCat = '基本', manQ = '';
function openManual() {   // v0.46: 分類の札＋検索、目次は読みやすい大きさの一覧
  tut('manual');
  const all = MAN.filter(m => m.c()); if (!all.find(m => m.k === manSel)) manSel = all[0].k;
  const txt = m => { try { return (m.t + ' ' + m.h()).replace(/<[^>]+>/g, ''); } catch (e) { return m.t; } };
  const list = manQ ? all.filter(m => txt(m).includes(manQ)) : all.filter(m => manCatOf(m.k) === manCat);
  if (list.length && !list.find(m => m.k === manSel)) manSel = list[0].k;
  const cur = all.find(m => m.k === manSel);
  const cats = MAN_CAT.map(c => [c[0], all.filter(m => manCatOf(m.k) === c[0]).length]).filter(c => c[1]);
  modal('説明書', `<div class="itool"><input id="manq" placeholder="🔍 ことばで探す（例：熟成、宝の地図）" value="${manQ.replace(/"/g, '')}" style="flex:1"></div>
    ${manQ ? `<div class="p">「${manQ}」が出てくるページ ${list.length}件　<i style="font-style:normal;color:var(--brass)" data-a="mqx">✕ 探すのをやめる</i></div>` : `<div class="seg many">${cats.map(c => `<div class="${c[0] === manCat ? 'on' : ''}" data-mc="${c[0]}">${c[0]}<br><small>${c[1]}</small></div>`).join('')}</div>`}
    <div class="manlist">${list.map(m => `<div class="${m.k === manSel ? 'on' : ''}" data-man="${m.k}">${m.t}</div>`).join('') || '<div class="p">見つからなかった</div>'}</div>
    <div class="h">${cur.t}</div><div class="manbody">${cur.h()}</div><div class="p" style="color:var(--sub)">機能が解放されるたびに、説明書のページも増える。</div>`, 'man');
  bind('[data-man]', d => { manSel = d.man; openManual(); setTimeout(() => { const h = document.querySelector('#modal .manbody'); if (h) h.scrollIntoView({block:'start'}); }, 30); });
  bind('[data-mc]', d => { manCat = d.mc; const f = all.find(m => manCatOf(m.k) === manCat); if (f) manSel = f.k; openManual(); });
  bind('[data-a=mqx]', () => { manQ = ''; openManual(); });
  const q = $('manq'); if (q) { q.onchange = () => { manQ = q.value.trim(); const f = all.find(m => !manQ || txt(m).includes(manQ)); if (f) manSel = f.k; openManual(); }; }
}

// ===== v0.26: 引き継ぎコード・実績と称号
// ---------- transfer code
async function makeCode() {
  const js = serialize();
  try {
    if (window.CompressionStream) {
      const cs = new Blob([js]).stream().pipeThrough(new CompressionStream('deflate'));
      const buf = new Uint8Array(await new Response(cs).arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
      return 'NK1:' + btoa(bin);
    }
  } catch (e) {}
  return 'NK0:' + btoa(unescape(encodeURIComponent(js)));
}
async function readCode(code) {
  code = (code || '').replace(/\s+/g, '');
  if (code.startsWith('NK0:')) return JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));
  if (code.startsWith('NK1:')) { const bin = atob(code.slice(4)), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const ds = new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate')); return JSON.parse(await new Response(ds).text()); }
  throw new Error('bad');
}
async function openTransfer(mode) {
  tut('xfer');
  if (mode === 'out') {
    modal('引き継ぎコード', '<div class="p">コードを作っています……</div>', 'xfer');
    const code = await makeCode(); try { localStorage.setItem('nk_exp_t', String(Date.now())); } catch (e) {}
    modal('引き継ぎコード', `<div class="p">このコードを、もう一方の端末の「施設」タブ →「データの引き継ぎ」→「コードで読み込む」に貼りつけると、今の続きから遊べる。<br><b>コードは今の時点のデータ</b>。このあと遊んだ分は入らない。</div>
      <textarea id="xcode" readonly style="width:100%;height:${U * 40}px;font-size:10px;background:#140e0a;color:#e8dcc0;border:1px solid #4a3422;border-radius:4px;word-break:break-all">${code}</textarea>
      <div class="p" style="color:var(--sub)">${fmt(code.length)}文字</div><div class="btn big grn" data-a="copy">コピーする</div>`, 'xfer');
    bind('[data-a=copy]', async () => { const ta = $('xcode'); let ok = false; try { await navigator.clipboard.writeText(code); ok = true; } catch (e) { try { ta.select(); ok = document.execCommand('copy'); } catch (_) {} } toast(ok ? '📋 コピーした' : 'コピーできなかった。コードを長押しして選んでコピーしてね', 3000); });
    return;
  }
  modal('コードで読み込む', `<div class="p">別の端末で作った引き継ぎコードを貼りつける。<b>今のデータは上書きされて消える</b>ので注意。</div>
    <textarea id="xin" style="width:100%;height:${U * 40}px;font-size:10px;background:#140e0a;color:#e8dcc0;border:1px solid #4a3422;border-radius:4px" placeholder="NK1:……"></textarea>
    <div class="btn big" data-a="load">読み込む</div>`, 'xfer');
  let armed = false;
  bind('[data-a=load]', async el => {
    const code = $('xin').value; let d;
    try { d = await readCode(code); } catch (e) { return toast('コードが正しくないみたい。最初から最後まで貼りつけたか確かめてね', 3500); }
    if (!d || typeof d.gold !== 'number' || typeof d.t !== 'number') return toast('宵闇亭のデータではないみたい', 3000);
    if (!armed) { armed = true; toast(`読み込むと今のデータは消える。所持金 ${fmt(d.gold)}G・${(o => MONTHS[o.m] + o.dd + '日')(ymd(Math.floor(d.t / 1440)))}のデータ。もう一度押すと読み込む`, 4500); return; }
    S = d; S.last = Date.now() + 10000; fixState(); saveNow(true); toast('読み込んだ。再読み込みします……', 2000); setTimeout(() => location.reload(), 1200);
  });
}
// ---------- achievements & titles
const ACH = [
  {id:'c1', n:'はじめての一皿', d:'料理を1皿作る', c:s => s.stat.cooked >= 1, r:50},
  {id:'c2', n:'見習い料理人', d:'料理を100皿作る', c:s => s.stat.cooked >= 100, r:300},
  {id:'c3', n:'熟練の料理人', d:'料理を1,000皿作る', c:s => s.stat.cooked >= 1000, r:2000},
  {id:'c4', n:'料理の鬼', d:'料理を10,000皿作る', c:s => s.stat.cooked >= 10000, r:20000},
  {id:'s1', n:'町の人気者', d:'料理を100皿売る', c:s => s.stat.sold >= 100, r:300},
  {id:'s2', n:'繁盛店の主', d:'料理を1,000皿売る', c:s => s.stat.sold >= 1000, r:3000},
  {id:'s3', n:'霧月通りの顔', d:'料理を10,000皿売る', c:s => s.stat.sold >= 10000, r:30000},
  {id:'e1', n:'小金持ち', d:'売上の合計 10,000G', c:s => s.stat.earned >= 10000, r:500},
  {id:'e2', n:'大商人', d:'売上の合計 100,000G', c:s => s.stat.earned >= 100000, r:5000},
  {id:'e3', n:'宵闇の大富豪', d:'売上の合計 1,000,000G', c:s => s.stat.earned >= 1000000, r:50000},
  {id:'r1', n:'レシピ収集家', d:'レシピを10種類見つける', c:s => Object.keys(s.known.r).length >= 10, r:200},
  {id:'r2', n:'料理の探究者', d:'レシピを50種類見つける', c:s => Object.keys(s.known.r).length >= 50, r:1500},
  {id:'r3', n:'歩く料理大全', d:'レシピを150種類見つける', c:s => Object.keys(s.known.r).length >= 150, r:8000},
  {id:'r4', n:'宵闇の料理帖', d:'レシピを300種類見つける', c:s => Object.keys(s.known.r).length >= 300, r:30000},
  {id:'f1', n:'釣り好き', d:'魚を100匹釣る', c:s => (s.stat.fished || 0) >= 100, r:1000},
  {id:'f2', n:'ヌシを釣った者', d:'ヌシを1匹釣る', c:s => ['nushi_pond', 'nushi_pier', 'nushi_lake'].some(id => s.known.i[id]), r:3000},
  {id:'f3', n:'三つのヌシの主', d:'ヌシを3種類すべて釣る', c:s => ['nushi_pond', 'nushi_pier', 'nushi_lake'].every(id => s.known.i[id]), r:15000},
  {id:'g1', n:'野の恵みを知る者', d:'食材を1,000回採集する', c:s => (s.stat.foraged || 0) >= 1000, r:3000},
  {id:'g2', n:'採集の達人', d:'採集Lv10', c:s => s.flv && s.flv.lv >= 10, r:10000},
  {id:'g3', n:'旅する店主', d:'7つの採集地すべてへ行く', c:s => BIOS.every(b => b.id === 'wilds' || (s.bio && s.bio[b.id] && s.bio[b.id].seen)), r:5000},
  {id:'g4', n:'コムギの相棒', d:'迷子の犬を仲間にする', c:s => s.dog && s.dog.joined, r:1000},
  {id:'m1', n:'迷宮の新米', d:'地下迷宮のB10へ', c:s => s.mine && s.mine.max >= 10, r:1000},
  {id:'m2', n:'深層の探索者', d:'地下迷宮のB30へ', c:s => s.mine && s.mine.max >= 30, r:5000},
  {id:'m3', n:'奈落の底を見た者', d:'地下迷宮のB50へ', c:s => s.mine && s.mine.max >= 50, r:20000},
  {id:'d1', n:'宵闇亭の二代目', d:'先代の日記を12ページすべて読む', c:s => s.story && s.story.n >= 12, r:10000},
  {id:'k1', n:'星を得た店', d:'評論家に★5をもらう', c:s => (s.reviews || []).some(r => r.stars >= 5), r:10000},
  {id:'k2', n:'料理大会の覇者', d:'料理コンテストで3回優勝', c:s => (s.trophy || 0) >= 3, r:10000},
  {id:'k3', n:'伝説の店主', d:'店の格「伝説の宵闇亭」', c:s => rankIdx() >= 4, r:20000},
  {id:'n1', n:'夜の店主', d:'深夜の客を100人もてなす', c:s => (s.stat.nightserved || 0) >= 100, r:5000},
  {id:'t1', n:'町の恩人', d:'町への投資を7つすべて', c:s => Object.keys(s.town || {}).length >= 7, r:20000},
  {id:'b1', n:'二つの店の主', d:'支店をLv5にする', c:s => s.branch && s.branch.lv >= 5, r:50000},
  {id:'o1', n:'おしゃれ店主', d:'店主の衣装を5着持つ', c:s => Object.keys(s.outfits || {}).length >= 5, r:3000},
  {id:'l1', n:'福の神のお気に入り', d:'福引きで金の玉を出す', c:s => (s.outfits || {}).happi, r:2000},
  {id:'x1', n:'勝負師', d:'魔族とのサイコロで10回勝つ', c:s => (s.stat.diceWin || 0) >= 10, r:3000},
  {id:'g9', n:'熟成の匠', d:'熟成品を50個作る', c:s => (s.stat.aged || 0) >= 50, r:8000},
  ...[[10, '町の誇り'], [25, '王都にも届く名'], [50, '大陸一の料理屋'], [100, '永遠の宵闇亭']].map(([lv, n], i) => ({id:'fm' + i, n, d:`名声Lv${lv}`, c:s => s.fame && s.fame.lv >= lv, r:lv * 1000})),
  {id:'kw1', n:'極めし者', d:'料理を1つ「極」にする', c:s => kiwaCount() >= 1, r:5000}, {id:'kw2', n:'十の極み', d:'料理を10品「極」にする', c:s => kiwaCount() >= 10, r:30000}, {id:'kw3', n:'百の極み', d:'料理を100品「極」にする', c:s => kiwaCount() >= 100, r:200000},
  {id:'ab1', n:'奈落を往く者', d:'地下迷宮のB100へ', c:s => s.mine && s.mine.max >= 100, r:30000}, {id:'ab2', n:'底なしの料理人', d:'地下迷宮のB200へ', c:s => s.mine && s.mine.max >= 200, r:100000}, {id:'ab3', n:'奈落の主', d:'地下迷宮のB300へ', c:s => s.mine && s.mine.max >= 300, r:300000},
  {id:'ab4', n:'鍛え抜かれた刃', d:'剣を＋10に鍛え直す', c:s => (s.forgeS || 0) >= 10, r:50000},
  {id:'tw1', n:'塔の挑戦者', d:'決闘の塔で10階', c:s => s.tower && s.tower.best >= 10, r:20000}, {id:'tw2', n:'塔の常連', d:'決闘の塔で30階', c:s => s.tower && s.tower.best >= 30, r:60000}, {id:'tw3', n:'塔を統べる者', d:'決闘の塔で50階', c:s => s.tower && s.tower.best >= 50, r:150000}, {id:'tw4', n:'天辺知らず', d:'決闘の塔で100階', c:s => s.tower && s.tower.best >= 100, r:500000},
  {id:'tw5', n:'鍛えし一皿', d:'カードを＋10に鍛える', c:s => s.tower && Object.values(s.tower.pts).some(p => p >= 100), r:50000},
  {id:'ex1', n:'港町の友', d:'港町シオカゼの評判Lv5', c:s => expLv('port') >= 5, r:50000}, {id:'ex2', n:'潮風の料理人', d:'シオカゼのレシピを12品すべて教わる', c:s => PORT_RI.every(ri => s.known.r[ri] || s.learned[ri]), r:30000},
  {id:'ex3', n:'砂の町の友', d:'砂の町サハランの評判Lv5', c:s => expLv('desert') >= 5, r:60000}, {id:'ex4', n:'砂漠の料理人', d:'サハランのレシピを12品すべて教わる', c:s => DESERT_RI.every(ri => s.known.r[ri] || s.learned[ri]), r:40000},
  {id:'g1', n:'一人前の冒険者', d:'ギルドランクC', c:s => s.guild && s.guild.rank >= 3, r:20000}, {id:'g2', n:'英雄の器', d:'ギルドランクS', c:s => s.guild && s.guild.rank >= 6, r:100000}, {id:'g3', n:'伝説の冒険者', d:'ギルドランクSSS', c:s => s.guild && s.guild.rank >= 8, r:300000},
  {id:'c1', n:'隊商の主', d:'キャラバンのもうけ100万G', c:s => s.cara && s.cara.earned >= 1000000, r:50000}, {id:'c2', n:'五台の隊商', d:'荷馬車を5台そろえる', c:s => s.cara && s.cara.wag.length >= 5, r:50000},
  {id:'l1', n:'伝説との出会い', d:'伝説の食材を手に入れる', c:s => Object.keys(LEG).some(id => s.known.i[id]), r:30000}, {id:'l2', n:'伝説の蒐集家', d:'伝説の食材を12種すべて', c:s => Object.keys(LEG).every(id => s.known.i[id]), r:300000}, {id:'u1', n:'究極の料理人', d:'究極の料理を12品すべて作る', c:s => s.ult && Object.keys(s.ult.made).length >= 12, r:500000},
  {id:'w1', n:'武器好き', d:'装備を50種集める', c:s => s.gear && Object.keys(s.gear.seen).length >= 50, r:20000}, {id:'w2', n:'武器商人も顔負け', d:'装備を200種集める', c:s => s.gear && Object.keys(s.gear.seen).length >= 200, r:100000}, {id:'w3', n:'伝説の担い手', d:'伝説の装備を手に入れる', c:s => s.gear && s.gear.list.some(g => g.r >= 4), r:100000}, {id:'w4', n:'付与師', d:'付与を10回する', c:s => s.gear && (s.gear.ench || 0) >= 10, r:20000},
  {id:'k1', n:'魔物狩り', d:'魔物を1,000体倒す', c:s => totalKills(s) >= 1000, r:30000}, {id:'k2', n:'魔物博士', d:'すべての魔物に★1', c:s => Object.keys(MONT).every(k => monStar(k, s) >= 1), r:30000}, {id:'k3', n:'魔物の天敵', d:'すべての魔物に★3', c:s => Object.keys(MONT).every(k => monStar(k, s) >= 3), r:500000},
  {id:'ex5', n:'茶の湯の心', d:'野点の茶会を10回もてなす', c:s => (s.stat.chakai || 0) >= 10, r:50000}, {id:'ex6', n:'王室御用達', d:'王宮に10回献上する', c:s => (s.stat.royal || 0) >= 10, r:60000},
  {id:'ex7', n:'南の島の常連', d:'南の果実島ルルアの評判Lv5', c:s => expLv('isle') >= 5, r:80000}, {id:'ex8', n:'五つの町の料理人', d:'5つの町のレシピ60品をすべて教わる', c:s => [...TOWN_RI].every(ri => s.known.r[ri] || s.learned[ri]), r:200000},
  {id:'w1', n:'昼と夜の店主', d:'白昼亭と提携する', c:s => s.rival && s.rival.ally, r:20000},
  {id:'a1', n:'創作料理人', d:'オリジナルレシピを5品作る', c:s => (s.aiRecs || []).length >= 5, r:5000},
];
function achTick() {
  if (!unl('ach')) return; if (!S.ach) S.ach = {};
  const got = []; for (const a of ACH) { if (S.ach[a.id]) continue; let ok = false; try { ok = a.c(S); } catch (e) {} if (ok) got.push(a); }
  if (!got.length) return;
  let sum = 0; for (const a of got) { S.ach[a.id] = gday() + 1; S.gold += a.r; sum += a.r; } dirty = true; sfx('ok'); tut('ach');
  if (!S.title) S.title = got[0].n;
  toast(got.length === 1 ? `🏆 実績「${got[0].d}」<br>称号<b>「${got[0].n}」</b>を手に入れた（+${fmt(sum)}G）` : `🏆 実績を${got.length}つ達成！ 称号「${got[0].n}」ほか（+${fmt(sum)}G）`, 4500);
}
function achHTML() {
  if (!S.ach) S.ach = {}; const got = ACH.filter(a => S.ach[a.id]).length;
  return `<div class="p">実績 ${got}/${ACH.length}。手に入れた称号をタップすると、画面の上に表示する称号を変えられる。</div><div class="p">今の称号：<b style="color:#e8c46e">${S.title ? '「' + S.title + '」' : 'なし'}</b>${S.title ? ' <span class="btn" data-ttl="" style="padding:1px 6px">外す</span>' : ''}</div>` +
    ACH.map(a => { const g = S.ach[a.id]; return `<div class="row ${g ? '' : 'achno'}" ${g ? `data-ttl="${a.n}"` : ''}><div class="calev">${g ? '🏆' : '・'}</div><div class="t"><b>${g ? '「' + a.n + '」' : '？？？'}${S.title === a.n ? ' <small style="color:#8ad08a">表示中</small>' : ''}</b><span>${a.d}　ごほうび ${fmt(a.r)}G</span></div></div>`; }).join('');
}
function bindAch() { bind('[data-ttl]', d => { S.title = d.ttl || null; dirty = true; hud(); openDex(); }); }

// ===== v0.27: 料理決闘の練習試合（ルールを1つずつ教える）
function lesCard(name, o) { let ri = REC.findIndex(r => r.name === name); if (ri < 0) ri = 0; return Object.assign({ri, cost:1, dmg:0, blk:0, burn:0, draw:0, weak:0, heal:0, en:0, les:1}, o); }
const LES_COACH = {k:'beard', n:'立会人ボルド'};
function lesSteps() {
  return [
    {t:'よく来たな。わしは決闘の立会人ボルドだ。<br>料理決闘は、<b>料理をカードにして</b>相手の料理人を唸らせる勝負。まずは練習試合で、ルールを1つずつ教えよう。', w:'next'},
    {t:'上の赤い棒が<b>相手の気力</b>。料理で唸らせて、これを<b>0にすれば勝ち</b>だ。', hl:'#dtop .dhp', w:'next'},
    {t:'こっちの緑の棒は<b>あなたの気力</b>。相手の料理に圧倒されると減る。<b>0になったら負け</b>。', hl:'#dme .dhp', w:'next'},
    {t:'下に並んでいるのが<b>手札</b>（毎ターン5枚引く）。<br>🔥が<b>火</b>。毎ターン3つ使える。カードの<b>左上の数字</b>が、そのカードに使う火の数だ。', hl:'#dme .den', w:'next'},
    {t:'まずは<b>評価</b>のカードを出そう。光っている「%0」をタップ。<br>評価＝相手の気力を削る力。', hl:'card:0', w:'play:0'},
    {t:'相手の気力が8減ったな。<br>次に<b>「次の手」</b>を見てくれ。相手がこのターンの終わりに何をするかがわかる。⚔6＝<b>6の攻め</b>が来る。', hl:'#dtop .dint', w:'next'},
    {t:'火は残り1つ。<b>守り</b>のカード「%1」で備えよう。<br>守り＝そのターンに受ける攻めを、数字の分だけ防ぐ（次のターンには消える）。', hl:'card:1', w:'play:1'},
    {t:'火を使い切った。<b>「ターン終了」</b>を押すと、相手の手番だ。<br>（使わなかったカードは捨て札に行き、山札がなくなると混ぜ直して使う）', hl:'#dend', w:'end'},
    {t:'守り6で、6の攻めをぴったり防げた。<br>新しいターンだ。火は3つに戻り、また5枚引いた。<br>今度の相手の手は<b>⚔10</b>。少し強いぞ。', hl:'#dtop .dint', w:'next'},
    {t:'特別な効果を覚えよう。まず「%2」（材料3つなので🔥2）。<br><b>辛さ</b>＝ターンの終わりごとに、その数字だけ相手の気力を削る。毎ターン1ずつ減っていく。', hl:'card:2', w:'play:2'},
    {t:'次は「%3」。<br><b>弱気</b>＝相手の攻めが4分の3に弱まる。数字のターン数だけ続く。<b>次の手の数字が下がる</b>のを見ていてくれ。', hl:'card:3', w:'play:3'},
    {t:'⚔10が⚔8になった。火を使い切ったので<b>ターン終了</b>。辛さが効くのを見ていてくれ。', hl:'#dend', w:'end'},
    {t:'ターンの終わりに辛さで3削れた（🌶の数字は1減って2）。<br>弱気のおかげで、受けた攻めは8で済んだ。', hl:'#dtop .dst', w:'next'},
    {t:'3ターン目。まず「%4」を出そう。<br><b>引く</b>＝山札からカードを引ける。引いたカードも、火が残っていればすぐ出せる。', hl:'card:4', w:'play:4'},
    {t:'ここからは自由だ。相手の気力はあと少し、火は残り2つ。<br>🔥2のカード1枚でも、🔥1を2枚でもいい。<b>相手の気力を0に</b>してみよう。', w:'free'},
  ];
}
function duelLesson() {
  if (!S.duelS) S.duelS = {best:0, wins:0, runs:0, deck:null};
  if (!S.tut) S.tut = {}; S.tut.duel = 1;
  const A = lesCard('焼き鳥', {cost:2, dmg:8}), D = lesCard('カフェラテ', {cost:1, blk:6}),
    F1 = lesCard('チーズバーガー', {cost:3, dmg:14, blk:4}), F2 = lesCard('フォー', {cost:3, dmg:10, blk:8}), F3 = lesCard('豚の角煮', {cost:2, dmg:7, blk:7}),
    B = lesCard('タンドリーチキン', {cost:2, dmg:3, burn:3}), W = lesCard('コーヒー', {cost:1, weak:2}),
    F4 = lesCard('メンチカツ', {cost:3, dmg:16, blk:5}), F5 = lesCard('ルーロー飯', {cost:3, dmg:12, blk:6}), F6 = lesCard('卵焼き', {cost:2, dmg:6, blk:4}),
    R = lesCard('冷やしトマト', {cost:1, dmg:2, draw:2}),
    T = [lesCard('焼きおにぎり', {cost:1, dmg:6}), lesCard('ポークソテー', {cost:2, dmg:10}), lesCard('トマトスープ', {cost:1, blk:5}), lesCard('チーズバーガー', {cost:3, dmg:18, blk:5})],
    G = [lesCard('目玉焼き', {cost:1, dmg:6}), lesCard('焼きなす', {cost:1, dmg:5})];
  const order = [A, D, F1, F2, F3, B, W, F4, F5, F6, R, ...T, ...G];
  duel = {stage:0, hpMax:60, deck:[], lvl:0, les:{i:0, names:[A, D, B, W, R].map(c => REC[c.ri].name)}};
  duel.hp = duel.hpMax; $('duelv').classList.add('show'); sfx('door');
  $('dplate').innerHTML = '<div class="dpl" style="opacity:.35">🍽<div>審査台</div></div>';
  duel.foe = {n:'練習相手 見習いピコ', k:'hood', hp:24, hpMax:24, blk:0, burn:0, weak:0, str:0, pi:0, sc:1, pat:[['atk', 6], ['atk', 10], ['atk', 7], ['atk', 6]]};
  duel.draw = order.slice().reverse(); duel.disc = []; duel.hand = []; duel.blk = 0; duel.weakMe = 0; duel.nextEn = 0; duel.turn = 0; duel.state = 'fight';
  startTurn();
}
function lesStep() { return duel && duel.les ? lesSteps()[duel.les.i] : null; }
function lesAllow(kind, c) {
  const st = lesStep(); if (!st) return true;
  if (st.w === 'free') return true;
  if (kind === 'play' && st.w.startsWith('play:')) { const want = duel.les.names[+st.w.slice(5)]; if (REC[c.ri].name === want) { duel.les.i++; return true; } }
  if (kind === 'end' && st.w === 'end') { duel.les.i++; return true; }
  lesNudge(); return false;
}
function lesNudge() { const b = $('dles'); if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } }
function lesApply() {
  document.querySelectorAll('#duelv .lhl').forEach(e => e.classList.remove('lhl'));
  let b = $('dles'); const st = lesStep();
  if (!st || duel.state !== 'fight') { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'dles'; $('duelv').appendChild(b); }
  const txt = st.t.replace(/%(\d)/g, (_, n) => duel.les.names[+n]);
  b.innerHTML = `<div class="lesc">${charHTML(LES_COACH.k, U * 14)}<div><div class="lesn">${LES_COACH.n}　<small>${duel.les.i + 1}/${lesSteps().length}</small></div><div class="lest">${txt}</div></div></div>${st.w === 'next' ? '<div class="btn lesok" id="lesok">わかった ▶</div>' : ''}`;
  b.className = st.w === 'free' ? 'free' : '';
  if (st.w === 'next') $('lesok').onclick = () => { duel.les.i++; lesApply(); };
  if (st.w === 'free') setTimeout(() => { if (lesStep() && lesStep().w === 'free' && $('dles')) $('dles').classList.add('fade'); }, 5000);
  if (st.hl) {
    let el = null;
    if (st.hl.startsWith('card:')) { const want = duel.les.names[+st.hl.slice(5)]; const i = duel.hand.findIndex(c => REC[c.ri].name === want); el = document.querySelector(`#dhand [data-pc="${i}"]`); }
    else el = document.querySelector(st.hl);
    if (el) el.classList.add('lhl');
  }
}
function lesWin() {
  duel.state = 'reward'; sfx('ok'); const b = $('dles'); if (b) b.remove();
  const D = S.duelS; D.lesson = 1; dirty = true;
  const pages = [
    `<div class="tth">⚔ 練習試合に勝った！</div><div class="ttx">見事だ。<br>本番では、勝つたびに<b>賞金</b>と、<b>新しい料理カードを1枚</b>選んでデッキに加えられる（知らないレシピなら、そのまま覚えられる）。カードの代わりに<b>休んで気力を30%回復</b>してもいい。</div>`,
    `<div class="tth">📖 料理の味がカードになる</div><div class="ttx">あなたが覚えたレシピが、そのままカードになる。<br>・<b>旨み</b>→評価　・<b>甘み</b>→守り　・<b>辛み</b>→辛さ<br>・<b>酸味</b>→引く　・<b>苦み</b>→弱気<br>調理法のおまけ：焼く＝評価+2、煮る＝守り+3、揚げる＝評価×1.3、蒸す＝回復、生＝引く+1、炊く＝次のターンの火+1<br>使う火の数は<b>材料の数</b>で決まる：材料1〜2つ＝🔥1、3つ＝🔥2、4つ以上＝🔥3。火が多いカードほど1枚が強い。<br>よく作った料理（熟練度）ほど評価が上がる。</div>`,
    `<div class="tth">🏆 本番のルール</div><div class="ttx">相手は<b>5人勝ち抜き</b>。だんだん強くなり、5人目は「井戸底の料理長ザハル」。<br>気力は勝負のあいだ持ち越し。途中で負けたら終わりだが、何度でも挑戦できる。<br><b>デッキ</b>は8〜14枚。決闘の画面でカードをタップして入れ替えられる。火1・2・3のカードを混ぜると、毎ターンの手が組み立てやすい。<br>5人全員に勝つと珍しい賞品。次からは相手が少し強くなる。</div>`,
  ];
  let pg = 0;
  const show = () => { $('dres').innerHTML = `<div class="tcard">${pages[pg]}<div class="btn big" id="dok">${pg < pages.length - 1 ? '次へ ▶' : '決闘のメニューへ'}</div></div>`;
    $('dok').onclick = () => { if (++pg < pages.length) show(); else { closeDuel(); openDuelMenu(); } }; };
  show();
}

// ===== v0.28: ライバル店「白昼亭」
const RIVAL_N = 'ヒナタ';
const rivWk = () => Math.floor(gday() / 7);
function rivalState() {
  if (!S.rival) {
    const d = Math.max(1, gday() + 1), avg = (S.stat.earned || 0) / d;
    S.rival = {open:rivWk() + 1, wk:rivWk() + 1, start:0, target:Math.max(20000, Math.round(avg * 7 * .9 / 1000) * 1000), wins:0, losses:0, ally:false, hist:[], intro:0, c0:S.stat.earned || 0, t0:S.t};
  }
  return S.rival;
}
function rivalGuess() { const R = S.rival, dd = (S.t - (R.t0 || S.t)) / 1440; return dd >= 1 ? Math.max(20000, Math.round(((S.stat.earned || 0) - (R.c0 || 0)) / dd * 7 * .95 / 1000) * 1000) : R.target; }
function rivalFrac() { const R = S.rival; return Math.max(0, Math.min(1, (S.t - R.wk * 7 * 1440) / (7 * 1440))); }
function rivalTheirs() { const R = S.rival, f = rivalFrac(); return Math.round(R.target * f * (1 + .06 * Math.sin(f * 9 + R.wk))); }
// v0.62 白昼亭は毎週の「お題」で勝負（売上・皿数・魚介・甘味・畑の作物・魔物料理・料理の種類）。目標はその週の初めに決まり、お題に合わせて棚を変えれば勝てる
const RV_TH = {
  sales:{n:'売上', u:'G', d:'今週の売上（店・出張販売・裏営業・宴会・依頼などすべて）', tip:'早めに開店し、棚を満杯に。高い料理を多く', ok:() => true},
  dish:{n:'売った皿数', u:'皿', d:'今週、店と裏営業で売れた料理の皿数', tip:'安くて早く作れる料理をたくさん並べる。棚の数を増やす', ok:() => true},
  sea:{n:'魚介の料理の売上', u:'G', d:'魚・貝・海藻など魚介を使った料理の売上', tip:'魚介の料理を棚に多く並べる。釣りと朝の魚市で材料を集める', ok:() => unl('fish')},
  sweet:{n:'甘い料理の売上', u:'G', d:'砂糖・蜂蜜・チョコレートなどを使った料理の売上', tip:'菓子や甘い料理を多く並べる', ok:() => true},
  mon:{n:'魔物料理の売上', u:'G', d:'魔物の素材を使った料理（魔）の売上', tip:'迷宮で素材を集め、魔物料理を並べる。裏営業の客も好む', ok:() => unl('monster')},
  vari:{n:'売れた料理の種類', u:'種', d:'今週売れた料理の種類の数（同じ料理は1つ）', tip:'いろいろな料理を少しずつ並べる。棚の料理をこまめに入れかえる', ok:() => true},
};
const rvCat = (key, k) => { const ri = key && key[0] === 'r' ? +key.slice(1) : -1, r = REC[ri]; if (!r) return false;
  return k === 'sea' ? r.ings.some(id => SEA_IDS.has(id)) : k === 'sweet' ? r.ings.some(id => SWEET_IDS.has(id) || ['cream', 'jam', 'custard', 'syrup', 'kuromitsu', 'anko', 'condensed'].includes(id)) : k === 'farm' ? r.ings.some(id => { const g = ING[INGI[id]]; return g && (g.src[0] === 'seed' || g.src[0] === 'tree'); }) : k === 'mon' ? isMonDish(key) : false; };
function rivalTrack(key, price) { const R = S.rival; if (!R || R.ally || !unl('rival')) return; const m = R.m || (R.m = {});
  m.sales = (m.sales || 0) + price; m.dish = (m.dish || 0) + 1; for (const k of ['sea', 'sweet', 'farm', 'mon']) if (rvCat(key, k)) m[k] = (m[k] || 0) + price;
  const vs = R.vs || (R.vs = {}); if (!vs[key]) { vs[key] = 1; m.vari = (m.vari || 0) + 1; } }
function rivalPickTheme() { const R = S.rival, last = R.th; const ks = Object.keys(RV_TH).filter(k => RV_TH[k].ok() && k !== last); return R.wins + R.losses === 0 ? 'sales' : pick(ks); }
// 目標＝これまでの週の平均（ならし）×倍率。お題に合わせて棚を変えた週があっても、目標はゆっくりしか上がらない
function rivalTarget(k) { const R = S.rival, E = R.ema || {}, wins = R.wins || 0, ease = Math.pow(.92, R.ls || 0);   // 負けが続くほど白昼亭も疲れてくる
  if (k === 'sales') { const b = E.sales || R.target || 20000; return Math.max(20000, Math.round(b * (1.02 + .02 * wins) * ease / 1000) * 1000); }
  const sales = E.sales || R.target || 20000;
  const est = k === 'dish' ? sales / 150 : k === 'vari' ? 8 : sales * (k === 'mon' ? .05 : .1);
  const v = (E[k] || est) * (k === 'dish' || k === 'vari' ? 1.05 + .02 * wins : 1.15 + .05 * wins) * ease;
  return k === 'dish' || k === 'vari' ? Math.max(k === 'vari' ? 6 : 30, Math.round(v)) : Math.max(3000, Math.round(v / 100) * 100); }
function rivalMine() { const R = S.rival; return R.th && R.th !== 'sales' ? ((R.m || {})[R.th] || 0) : Math.max(0, (S.stat.earned || 0) - R.start); }
const rvFmt = (v, k) => RV_TH[k || 'sales'].u === 'G' ? fmt(v) + 'G' : fmt(v) + RV_TH[k || 'sales'].u;
function rivalStep() {
  if (!unl('rival')) return; const R = rivalState();
  if (!R.intro && !simulating && !tutOpen && !$('intro')) { R.intro = 1; dirty = true; rivalIntro(); }
  if (R.ally) { rivalMorning(); return; }
  const wk = rivWk();
  if (wk < R.open) return;
  if (R.wk < R.open) R.wk = R.open;
  if (!R.started) { R.started = 1; const dd = (S.t - (R.t0 || S.t)) / 1440; if (dd >= 1) R.target = Math.max(20000, Math.round(((S.stat.earned || 0) - (R.c0 || 0)) / dd * 7 * .95 / 1000) * 1000); R.start = S.stat.earned || 0; R.wk = wk; R.th = 'sales'; R.m = {}; R.vs = {}; dirty = true; if (!simulating) toast(`☀ 白昼亭が開店した。今週の売上勝負が始まる（日曜が終わったときに結果発表）`, 4000); return; }
  if (wk > R.wk) rivalSettle(wk);
}
function rivalSettle(wk) {
  const R = S.rival, mine = rivalMine(), theirs = R.target, win = mine > theirs, th = R.th || 'sales';
  R.hist.unshift({wk:R.wk, mine, theirs, win, th}); R.hist = R.hist.slice(0, 8);
  const mm = Object.assign({}, R.m || {}); mm.sales = Math.max(0, (S.stat.earned || 0) - R.start); R.mh = [mm, ...(R.mh || [])].slice(0, 2); R.ema = R.ema || {}; for (const k of Object.keys(RV_TH)) { const v = mm[k] || 0; R.ema[k] = R.ema[k] == null ? v : R.ema[k] * .7 + v * .3; }
  let gold = 0;
  if (win) { R.wins++; gold = Math.max(5000, Math.round(theirs * .08 / 100) * 100); S.gold += gold; S.rep = Math.min(100, S.rep + 3 * repDim()); } else R.losses++;
  // next week's target: based on your last week, grows with each win
  R.ls = win ? 0 : (R.ls || 0) + 1; R.wk = wk; R.start = S.stat.earned || 0; R.m = {}; R.vs = {}; R.th = rivalPickTheme(); R.target = rivalTarget(R.th); dirty = true;
  const allyNow = win && R.wins >= 3;
  if (allyNow) R.ally = true;
  if (simulating) { rep_.rival = win ? `白昼亭との売上勝負に勝った（+${fmt(gold)}G）` : '白昼亭との売上勝負に負けた'; if (allyNow) rep_.rival += '。白昼亭と提携した'; return; }
  const face = `<div class="tst">${charHTML('hinata', U * 22)}<div><div class="tth">白昼亭の店主 ${RIVAL_N}</div></div></div>`;
  const tbl_ = `<div class="ttx">今週のお題「${RV_TH[th].n}」<br>宵闇亭　<b>${rvFmt(mine, th)}</b><br>白昼亭　<b>${rvFmt(theirs, th)}</b></div>`;
  if (allyNow) popStory(`${face}<div class="tth">☀🌙 3勝目！</div>${tbl_}<div class="ttx">「……参った。あんたの店、夜になっても客が笑ってる。うちは昼しか開けてないのにね」<br>「勝負はおしまい。これからは<b>昼は白昼亭、夜は宵闇亭</b>。組まない？」<br><br><b>白昼亭と提携した</b>。毎朝、白昼亭から売上の分け前と珍しい食材が届く。賞金 +${fmt(gold)}G</div>`);
  else if (win) popStory(`${face}<div class="tth">☀ 白昼亭に勝った！（${R.wins}勝）</div>${tbl_}<div class="ttx">「くっ……来週は負けないから！」<br>賞金 +${fmt(gold)}G・評判アップ。<br>白昼亭は来週、もっと手ごわくなる（あと${3 - R.wins}勝で決着）。</div><div class="ttx">来週のお題：<b>${RV_TH[R.th].n}</b>（白昼亭の目標 ${rvFmt(R.target, R.th)}）<br>${RV_TH[R.th].tip}</div>`);
  else popStory(`${face}<div class="tth">白昼亭の勝ち……</div>${tbl_}<div class="ttx">「ふふん、昼の客はうちのものね」<br>負けても失う物はない。</div>` + (R.ally ? '' : `<div class="ttx">来週のお題：<b>${RV_TH[R.th].n}</b>（白昼亭の目標 ${rvFmt(R.target, R.th)}）<br>${RV_TH[R.th].tip}</div>`));
}
function rivalMorning() {
  const R = S.rival, bd = bday(); if (R.day === bd) return; R.day = bd;
  const g = Math.max(1000, Math.round(R.target / 7 * .12 / 100) * 100), id = pick(['saffron', 'truffle', 'caviar', 'vanilla', 'dragonfruit']);
  S.gold += g; add(S.inv, id, 1); S.known.i[id] = true; dirty = true;
  const t = `☀ 白昼亭から：分け前 ${fmt(g)}G・${ingName(id)}×1（倉庫へ）`;
  if (simulating) rep_.rivalAlly = t; else toast(t, 3500);
}
function rivalIntro() {
  popStory(`<div class="tst">${charHTML('hinata', U * 22)}<div><div class="tth">白昼亭の店主 ${RIVAL_N}</div></div></div><div class="ttx">「はじめまして、おとなりさん！ 来週から、ここで<b>白昼亭</b>を開くの。朝から夕方まで、明るくて安くておいしいお店」<br>「あなたが噂の宵闇亭ね。……ねえ、勝負しない？ <b>毎週（月〜日曜）の売上</b>で、どっちが上か」<br>「勝ち負けは日曜が終わったときに発表。うちの店をのぞけば、途中の様子もわかるわよ」</div>`);
}
function openRival() {
  const R = rivalState(); tut('rival');
  let html = `<div class="tst">${charHTML('hinata', U * 18)}<div><b>白昼亭の店主 ${RIVAL_N}</b><br><span style="color:var(--sub)">${R.ally ? '「昼はまかせて。夜はよろしくね、相棒」' : R.wins === 2 ? '「次で決まりね。……負けないから」' : R.wins ? '「今週こそ勝つからね！」' : '「昼の客はぜんぶ、うちがもらうわ」'}</span></div></div>`;
  if (R.ally) html += `<div class="p">☀🌙 <b>提携中</b>。毎朝、売上の分け前（今は約${fmt(Math.max(1000, Math.round(R.target / 7 * .12 / 100) * 100))}G）と珍しい食材が1つ届く。</div>`;
  else if (rivWk() < R.open) html += `<div class="p">開店準備中。<b>来週の月曜</b>から売上勝負が始まる。白昼亭の最初の目標は、開店までのあなたの売上の勢いをもとに決まる（今の見込み 約${fmt(rivalGuess())}G）。</div>`;
  else {
    const T = R.th || 'sales', mine = rivalMine(), th = rivalTheirs(), left = 7 - (gday() % 7) - 1, mx = Math.max(mine, R.target, 1);
    const bar = (v, c) => `<div style="height:calc(var(--u)*3);background:#1a1410;border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100, v / mx * 100)}%;background:${c}"></i></div>`;
    html += `<div class="h">今週のお題「${RV_TH[T].n}」（${R.wins}勝${R.losses}敗・3勝で決着）</div><div class="p">${RV_TH[T].d}で勝負。<br>💡 ${RV_TH[T].tip}</div>
      <div class="row"><div class="t"><b>🌙 宵闇亭　${rvFmt(mine, T)}</b>${bar(mine, '#c8a050')}</div></div>
      <div class="row"><div class="t"><b>☀ 白昼亭　${rvFmt(th, T)}</b><span>今週の目標 ${rvFmt(R.target, T)}（白昼亭は週の終わりにここまで届く）</span>${bar(th, '#e8e0c8')}</div></div>
      <div class="p">${left > 0 ? `結果発表まであと<b>${left}日</b>（日曜が終わったとき）。` : '<b>今日が最終日</b>。今夜の0時に結果発表。'}${mine > th ? '今のところ<b>宵闇亭が上</b>。' : '今のところ白昼亭が上。'}</div>
      <div class="p" style="color:var(--sub);${T === 'sales' ? '' : 'display:none'}">売上を伸ばすには：早めに開店する／棚を満杯にしておく／行事・流行の料理を出す／宴会や依頼をこなす／出張販売と裏営業の売上も数に入る。</div>`;
  }
  if (R.hist.length) html += `<div class="h">これまでの勝負</div>` + R.hist.map(h => `<div class="row"><div class="calev">${h.win ? '🏆' : '・'}</div><div class="t"><b>${(o => MONTHS[o.m] + o.dd + '日の週')(ymd(h.wk * 7))}　${h.win ? '勝ち' : '負け'}</b><span>${h.th ? RV_TH[h.th].n + '：' : ''}宵闇亭 ${rvFmt(h.mine, h.th)} ／ 白昼亭 ${rvFmt(h.theirs, h.th)}</span></div></div>`).join('');
  modal('白昼亭', html, 'rival');
}
function drawForgeHut() {
  if (scene !== 'outside' || !IMG.forge) return; const h = hmNow(), nt = h >= 1080 || h < 360 ? 1 : 0;
  if (IMG.stall_spr) ctx.drawImage(IMG.stall_spr, 4, 288);
  ctx.drawImage(IMG.forge, nt * 50, 0, 50, 44, 2, 236, 50, 44);
  if (Math.floor(tNow * 3) % 2 && IMG.chars) { ctx.fillStyle = 'rgba(255,170,70,.55)'; ctx.fillRect(26 + Math.floor(tNow * 7) % 3, 263, 1, 1); }
}
function openForgeHut() { tut('m_forgehut'); openForge(null); }
function drawRival() {
  if (!unl('rival') || !IMG.rival) return; const R = S.rival || {}, h = hmNow();
  const open = R.ally || (rivWk() >= (R.open || 0) && h >= 480 && h < 1080), fr = R.ally ? (h >= 360 && h < 1080 ? 2 : 1) : open ? 0 : 1;
  ctx.drawImage(IMG.rival, fr * 44, 0, 44, 56, 99, 92, 44, 56);
  if (open && h >= 480 && h < 1080 && IMG.chars) { const bob = (tNow * 2 | 0) % 2; ctx.drawImage(IMG.chars, CH.hinata * 16, 0, 16, 18, 112, 131 - bob, 16, 18); }
}

// ===== v0.29: 地下貯蔵庫と熟成
const AGE = {
  beef:{to:'aged_beef', k:'meat', d:4}, ham:{to:'aged_ham', k:'meat', d:5}, cheese:{to:'aged_cheese', k:'cheese', d:4},
  wine:{to:'vintage_wine', k:'barrel', d:6}, sake:{to:'koshu', k:'barrel', d:5}, soysauce:{to:'aged_soy', k:'barrel', d:4},
  vinegar:{to:'kurozu', k:'barrel', d:3}, miso:{to:'aged_miso', k:'crock', d:5}, tsukemono:{to:'furuzuke', k:'crock', d:3},
};
const CEL_KIND = ['empty', 'barrel', 'crock', 'cheese', 'meat', 'locked'];
const CEL_XY = [...Array(16)].map((_, i) => [14 + (i % 4) * 30 + 6, 76 + Math.floor(i / 4) * 36]);
const celCap = () => [0, 6, 10, 16][S.fac.cellar || 0];
function celState() { if (!S.cellar) S.cellar = {slots:[]}; return S.cellar; }
function celQ(s) { return Math.min(3, s.q0 + (S.t - s.t0) / 1440); }
function celDoneAt(s) { return s.t0 + ((3 - Math.min(3, s.q0)) + AGE[s.id].d) * 1440; }
function celDone(s) { return S.t >= celDoneAt(s); }
function celLeft(s) { const m = Math.max(0, celDoneAt(s) - S.t), d = Math.floor(m / 1440), h = Math.ceil((m % 1440) / 60); return d ? `${d}日${h ? h + '時間' : ''}` : `${h}時間`; }
function celStep() {
  if (!S.fac.cellar || !S.cellar) return;
  for (const s of S.cellar.slots) if (s && !s.note && celDone(s)) { s.note = 1; dirty = true;
    const t = `🍷 地下貯蔵庫：${ingName(AGE[s.id].to)}×${s.n}ができた`; if (simulating) rep_.cellar = (rep_.cellar ? rep_.cellar + '、' : '') + `${ingName(AGE[s.id].to)}×${s.n}`; else toast(t, 3500); }
}
function celTake(i, quiet) {
  const C_ = celState(), s = C_.slots[i]; if (!s) return;
  if (celDone(s)) { const to = AGE[s.id].to; withQ(3, () => add(S.inv, to, s.n)); S.known.i[to] = true; S.stat.aged = (S.stat.aged || 0) + s.n;
    if (!quiet) toast(`${ingName(to)}×${s.n}を倉庫に入れた（★★★）`); }
  else { const q = celQ(s); withQ(q, () => add(S.inv, s.id, s.n)); if (!quiet) toast(`${ingName(s.id)}×${s.n}を取り出した（${qStars(q)}）`); }
  C_.slots[i] = null; dirty = true; sfx('ok');
}
function openCellarSlot(i) {
  if (i >= celCap()) return lockedMsg('cellar');
  const C_ = celState(), s = C_.slots[i];
  const ready = C_.slots.map((x, j) => x && celDone(x) ? j : -1).filter(j => j >= 0);
  const all = ready.length > 1 ? `<div class="btn big grn" data-a="celall">完成した熟成品をまとめて取り出す（${ready.length}台）</div>` : '';
  if (s) {
    const a = AGE[s.id], q = celQ(s), done = celDone(s), pct = Math.min(100, Math.round((S.t - s.t0) / (celDoneAt(s) - s.t0) * 100));
    let html = `<div class="row">${ingIc(s.id, U * 13)}<div class="t"><b>${ingName(s.id)} ×${s.n}</b><span>今の品質 ${qStars(q)}　→　${ingName(a.to)}（${fmt(ING[INGI[a.to]].value)}G）</span></div></div>
      <div style="height:calc(var(--u)*3);background:#1a1410;border-radius:3px;overflow:hidden;margin:4px 0"><i style="display:block;height:100%;width:${pct}%;background:${done ? '#e8c040' : '#a8743a'}"></i></div>
      <div class="p">${done ? `<b>熟成が終わった！</b> ${ingName(a.to)}×${s.n}（★★★）になっている。` : q < 3 ? `品質が上がっている途中（約1日で★1つ）。熟成品になるまで あと<b>${celLeft(s)}</b>。` : `★3になった。熟成品になるまで あと<b>${celLeft(s)}</b>。`}</div>
      <div class="btn big ${done ? 'grn' : ''}" data-a="celtake">${done ? '取り出す' : `いま取り出す（${qStars(q)}の${ingName(s.id)}に戻る）`}</div>${all}`;
    modal(`熟成台 ${i + 1}`, html, 'cellar');
    bind('[data-a=celtake]', () => { celTake(i); closeModal(); });
    bind('[data-a=celall]', () => { ready.forEach(j => celTake(j, true)); toast(`熟成品を${ready.length}台ぶん倉庫に入れた（★★★）`); closeModal(); });
    return;
  }
  const opts = Object.keys(AGE).filter(id => haveIng(id) > 0);
  let html = `<div class="p">寝かせる食材を選ぶ（同じ食材を最大10個）。約1日で品質★が1つ上がり、★3になってからさらに寝かせると<b>熟成品</b>になる。途中で取り出すこともできる。</div>${all}`;
  html += Object.entries(AGE).map(([id, a]) => { const h = haveIng(id), days = Math.ceil(3 - Math.min(3, qOf(id))) + a.d;
    return `<div class="row" style="${h ? '' : 'opacity:.45'}">${ingIc(id, U * 11)}<div class="t"><b>${ingName(id)}　所持${h}　${qStars(qOf(id))}</b><span>→ ${isKnown(a.to) ? ingName(a.to) : '？？？'}（約${days}日）</span></div>${h ? [1, 5, 10].filter(n => n === 1 || h >= n).map(n => `<div class="btn" data-put="${id}:${n}">${n}</div>`).join('') + (h > 1 && h < 10 && ![5].includes(h) ? `<div class="btn" data-put="${id}:${h}">${h}</div>` : '') : ''}</div>`; }).join('');
  if (!opts.length) html += `<div class="p" style="color:var(--sub)">今は寝かせられる食材を持っていない（牛肉・ハム・チーズは市場、ワイン・酒・醤油・酢・味噌・漬物は加工器具や市場で）。</div>`;
  modal(`熟成台 ${i + 1}（空き）`, html, 'cellar');
  bind('[data-a=celall]', () => { ready.forEach(j => celTake(j, true)); toast(`熟成品を${ready.length}台ぶん倉庫に入れた（★★★）`); closeModal(); });
  bind('[data-put]', d => { const [id, ns] = d.put.split(':'), n = Math.min(10, +ns, haveIng(id)); if (n <= 0) return;
    const q0 = qOf(id); takeIng(id, false, n); C_.slots[i] = {id, n, t0:S.t, q0:Math.max(1, Math.min(3, q0))}; dirty = true; sfx('ok'); tut('cellar_put');
    toast(`${ingName(id)}×${n}を熟成台${i + 1}に寝かせた`); closeModal(); });
}
function drawCellar() {
  if (!IMG.cellarobj) return; const C_ = celState(), cap = celCap();
  CEL_XY.forEach(([x, y], i) => {
    const s = C_.slots[i], kind = i >= cap ? 'locked' : s ? AGE[s.id].k : 'empty';
    ctx.drawImage(IMG.cellarobj, CEL_KIND.indexOf(kind) * 20, 0, 20, 24, x, y, 20, 24);
    if (s) {
      const done = celDone(s), pct = Math.min(1, (S.t - s.t0) / (celDoneAt(s) - s.t0));
      ctx.fillStyle = '#140e0a'; ctx.fillRect(x + 2, y + 25, 16, 2); ctx.fillStyle = done ? '#e8c040' : '#a8743a'; ctx.fillRect(x + 2, y + 25, Math.round(16 * pct), 2);
      if (done) { const p = (tNow * 3 + i) % 3; ctx.fillStyle = `rgba(255,232,150,${.5 + .5 * Math.sin(tNow * 4 + i)})`; ctx.fillRect(x + 4 + (p | 0) * 5, y - 3, 1, 3); ctx.fillRect(x + 3 + (p | 0) * 5, y - 2, 3, 1); }
    }
  });
}
function drawTrapdoor() { if (S.fac.cellar && IMG.trapdoor) ctx.drawImage(IMG.trapdoor, 52, 112); }
SCENES.cellar = {name:'宵闇亭　地下貯蔵庫', short:'地下貯蔵庫', objs:[
  {id:'up', lb:'階段：厨房へ戻る', r:[110, 0, 144, 58], st:[124, 66], act:() => go('interior', 61, 130)},
  ...CEL_XY.map(([x, y], i) => ({id:'cel' + i, lb:`熟成台${i + 1}`, r:[x - 1, y - 2, x + 21, y + 27], st:[x + 10, y + 31], act:() => openCellarSlot(i)})),
]};
WALKDEF.cellar = {areas:[[8, 60, 136, 224], [112, 54, 140, 66]], blocks:CEL_XY.map(([x, y]) => [x + 1, y + 8, x + 19, y + 26])};
SCENES.interior.objs.push({id:'trap', lb:'床扉：地下貯蔵庫へ', r:[50, 110, 72, 126], st:[61, 132], cond:() => S.fac.cellar > 0, act:() => go('cellar', 124, 66)});

// ===== v0.30: 名声レベル・料理の極み
// ---------- fame
const fameNeed = lv => Math.round(1000 * Math.pow(lv, 1.4));
const fameMul = () => { if (!unl('fame') || !S.fame) return 1; const l = S.fame.lv - 1; return 1 + Math.min(l, 50) * .004 + Math.max(0, l - 50) * .001; };
const FAME_T = [[10, '町の誇り'], [25, '王都にも届く名'], [50, '大陸一の料理屋'], [100, '永遠の宵闇亭']];
function fameState() { if (!S.fame) S.fame = {lv:1, xp:0, e0:S.stat.earned || 0, log:[]}; return S.fame; }
function fameStep() {
  if (!unl('fame')) return; const F = fameState(), e = S.stat.earned || 0, d = e - F.e0; if (d <= 0) { F.e0 = e; return; }
  F.e0 = e; F.xp += d / 100 * (.5 + S.rep / 100); let up = 0;
  while (F.xp >= fameNeed(F.lv)) { F.xp -= fameNeed(F.lv); F.lv++; up++; fameReward(F.lv); }
  if (up) { dirty = true; if (!simulating) { sfx('ok'); toast(`🌟 名声が<b>Lv${F.lv}</b>に上がった（料理の価値 +${((fameMul() - 1) * 100).toFixed(1)}%）`, 3500); } else rep_.fame = `名声Lv${F.lv}`; }
}
function fameReward(lv) {
  const F = S.fame; if (lv % 5) return;
  const g = 2000 * lv, id = pick(['saffron', 'truffle', 'caviar', 'moon_extract', 'phoenix_egg']), n = 1 + Math.floor(lv / 25);
  S.gold += g; add(S.inv, id, n); S.known.i[id] = true;
  F.log.unshift({lv, t:`${fmt(g)}G・${ingName(id)}×${n}`}); F.log = F.log.slice(0, 10);
  if (!simulating) popStory(`<div class="tth">🌟 名声Lv${lv}</div><div class="ttx">宵闇亭の名がさらに広まった。<br>町の人たちから贈り物：<b>${fmt(g)}G・${ingName(id)}×${n}</b>（倉庫へ）${FAME_T.find(x => x[0] === lv) ? `<br>称号「${FAME_T.find(x => x[0] === lv)[1]}」を手に入れた` : ''}</div>`);
}
function openFame() {
  if (!unl('fame')) return; const F = fameState(), nd = fameNeed(F.lv), nx = (Math.floor(F.lv / 5) + 1) * 5, nt = FAME_T.find(x => x[0] > F.lv);
  modal('名声', `<div class="p">店の格「${RANKS[rankIdx()].n}」の先。売上と評判で名声が貯まり、レベルに上限はない。</div>
    <div class="row"><div class="calev">🌟</div><div class="t"><b>名声Lv${F.lv}</b><span>次のLvまで ${fmt(Math.ceil(nd - F.xp))}（売上100Gごとに 0.5＋評判/100）</span>
    <div style="height:calc(var(--u)*3);background:#1a1410;border-radius:3px;overflow:hidden;margin-top:2px"><i style="display:block;height:100%;width:${Math.min(100, F.xp / nd * 100)}%;background:#e8c040"></i></div></div></div>
    <div class="p">いまの効果：料理の価値 <b>+${((fameMul() - 1) * 100).toFixed(1)}%</b>（Lv50までは1Lvごと+0.4%、その先は+0.1%）<br>5Lvごとに町からの贈り物（次はLv${nx}）。${nt ? `Lv${nt[0]}で称号「${nt[1]}」。` : ''}</div>
    ${F.log.length ? '<div class="h">これまでの贈り物</div>' + F.log.map(x => `<div class="row"><div class="t"><b>Lv${x.lv}</b><span>${x.t}</span></div></div>`).join('') : ''}`, 'fame');
  tut('fame');
}
// ---------- kiwami (料理の極み)
const KIWA_T = [150, 400, 800, 1500, 2500];
const kiwaNeed = k => k <= KIWA_T.length ? KIWA_T[k - 1] : KIWA_T[KIWA_T.length - 1] + (k - KIWA_T.length) * 1500;
const kiwaLv = key => { if (!unl('kiwami')) return 0; const n = S.mast[key] || 0; let k = 0; while (n >= kiwaNeed(k + 1)) k++; return k; };
const kiwaMul = key => 1 + .05 * kiwaLv(key);
const KIWA_N = ['', '極', '極・弐', '極・参', '極・肆', '極・伍'];
const kiwaName = k => k < KIWA_N.length ? KIWA_N[k] : '極・' + k;
const kiwaCount = () => Object.keys(S.mast || {}).filter(k => kiwaLv(k) >= 1).length;
const KIWA_M = [1, 3, 5, 10, 20, 30, 50, 75, 100];
const kiwaMile = i => i < KIWA_M.length ? KIWA_M[i] : 100 + (i - KIWA_M.length + 1) * 50;
function kiwaStep() {
  if (!unl('kiwami')) return; if (!S.kiwa) S.kiwa = {lv:{}, mile:0};
  const K = S.kiwa;
  for (const key in S.mast) { const k = kiwaLv(key); if (k > (K.lv[key] || 0)) { K.lv[key] = k; dirty = true; tut('kiwami');
    if (!simulating) toast(`🔥 ${dishInfo(key).name}が<b>「${kiwaName(k)}」</b>に達した（価値 +${k * 5}%）`, 3800); } }
  const c = kiwaCount();
  while (c >= kiwaMile(K.mile)) { const m = kiwaMile(K.mile), g = 3000 * m; S.gold += g; K.mile++; dirty = true;
    if (!simulating) popStory(`<div class="tth">🔥 極めた料理 ${m}品</div><div class="ttx">料理人としての腕が認められた。<br>ごほうび <b>${fmt(g)}G</b>${m >= 5 ? `・月光エキス×${Math.ceil(m / 10)}` : ''}</div>`);
    if (m >= 5) add(S.inv, 'moon_extract', Math.ceil(m / 10)); }
}
function kiwaHTML() {
  const K = S.kiwa || {lv:{}, mile:0}, c = kiwaCount(), nm = kiwaMile(K.mile);
  const keys = Object.keys(S.mast || {}).filter(k => (S.mast[k] || 0) >= 30 && (k[0] === 'r' ? S.known.r[+k.slice(1)] : true)).sort((a, b) => S.mast[b] - S.mast[a]).slice(0, 60);
  return `<div class="p">料理を作り続けると、熟練度★5の先の<b>「極」</b>に達する（${KIWA_T.join('・')}皿、その先は1,500皿ごと。上限なし）。極みの段階ごとに価値 +5%。<br>極めた料理 <b>${c}品</b>　次のごほうびは${nm}品で ${fmt(3000 * nm)}G</div>` +
    (keys.length ? keys.map(k => { const n = S.mast[k], kl = kiwaLv(k), nd = kiwaNeed(kl + 1), pv = kl ? kiwaNeed(kl) : 60;
      return `<div class="row">${dishIcHTML(k, U * 11)}<div class="t"><b>${dishInfo(k).name}${kl ? ` <span style="color:#ff9a4a">「${kiwaName(kl)}」</span>` : ''}</b><span>${fmt(n)}皿　次の段階まで ${fmt(nd - n)}皿</span>
        <div style="height:calc(var(--u)*2);background:#1a1410;border-radius:3px;overflow:hidden;margin-top:2px"><i style="display:block;height:100%;width:${Math.max(0, Math.min(100, (n - pv) / (nd - pv) * 100))}%;background:${kl ? '#ff9a4a' : '#a8743a'}"></i></div></div></div>`; }).join('')
      : '<div class="p" style="color:var(--sub)">まだ30皿以上作った料理がない。</div>');
}

// ===== v0.31: 奈落の深層（B51〜無限）
const DEEP_V = ['deep', 'mist', 'dark', 'vein', 'den', 'garden'];
const DEEP_VN = {deep:'深層', mist:'毒霧の階', dark:'暗闇の階', vein:'鉱脈の階', den:'魔物の巣', garden:'地底の庭'};
const DEEP_VD = {deep:'古い地下都市の跡', mist:'毒の霧で体力がじわじわ減る。霧の実が採れる', dark:'自分のまわりしか見えない。宝箱がある', vein:'鉱石と宝石が多い', den:'魔物が多い。深層獣の肉を落とす', garden:'魔物がいない。深層の食材が採れる'};
const DEEP_MONS = ['meibeast', 'shade', 'darkbird', 'slimed'];
const isDeep = f => unl('abyss') && f > 50;
// v0.62 深層の壁をなくす：B300より深い所は10階ごと×1.05に。深さの記録（B101〜）10階ごとに攻撃×1.03・受けるダメージ÷1.03（ずっと）
const deepSc = f => f <= 300 ? 2.225 * Math.pow(1.12, (f - 51) / 10) : 2.225 * Math.pow(1.12, 24.9) * Math.pow(1.05, (f - 300) / 10);
const deepRecN = () => Math.max(0, Math.floor(((S.mine && S.mine.max) || 0) - 100) / 10 | 0);
const deepMul = () => Math.pow(1.03, deepRecN());
const forgeMulS = () => 1 + .12 * (S.forgeS || 0), forgeMulA = () => 1 / (1 + .1 * (S.forgeA || 0));
function deepGen(fl) {
  const f = fl.f, M = mineState(), cp = f % 5 === 0;
  const v = cp ? 'deep' : wpick([{v:'deep', w:45}, {v:'mist', w:11}, {v:'dark', w:11}, {v:'vein', w:11}, {v:'den', w:11}, {v:'garden', w:11}]).v;
  fl.v = v; fl.lake = null; fl.lava = false; fl.special = cp ? 'cp' : null; fl.plants = [];
  fl.chest = v === 'dark' ? {x:64, y:132, open:false} : (!cp && Math.random() < .08 ? {x:64, y:132, open:false} : null);
  const W_ = {stone:40, diamond:10, moonstone:10, meitetsu:14, yasho:10, hoshikui:8, naraku:6};
  const w = Object.entries(W_).map(([k, x]) => ({k, w:v === 'vein' && k !== 'stone' ? x * 3 : x}));
  const n = cp ? 8 : v === 'vein' ? 34 : v === 'garden' ? 10 : 22;
  const bad = (x, y) => (x > 54 && x < 90 && y < 66) || (fl.chest && Math.abs(x - fl.chest.x) < 20 && Math.abs(y - fl.chest.y) < 18) || (fl.elevator && x < 40 && y < 70) || (fl.ladder && Math.abs(x - fl.ladder.x) < 20 && Math.abs(y - fl.ladder.y) < 18);
  fl.rocks = [];
  for (let i = 0; i < n; i++) for (let t = 0; t < 30; t++) {
    const x = Math.round(rnd(14, 116)), y = Math.round(rnd(52, 222));
    if (bad(x, y) || fl.rocks.some(o => Math.abs(o.x - x) < 16 && Math.abs(o.y - y) < 14)) continue;
    const k = wpick(w).k; fl.rocks.push({x, y, k, hp:ROCKHP[k], max:ROCKHP[k]}); break;
  }
  const np = v === 'garden' ? 8 : v === 'mist' ? 3 : 0;
  for (let i = 0; i < np; i++) for (let t = 0; t < 30; t++) {
    const x = Math.round(rnd(18, 120)), y = Math.round(rnd(60, 222));
    if (bad(x, y) || fl.rocks.some(o => Math.abs(o.x - x) < 14 && Math.abs(o.y - y) < 12) || fl.plants.some(o => Math.abs(o.x - x) < 14 && Math.abs(o.y - y) < 12)) continue;
    fl.plants.push({x, y, id:v === 'mist' ? 'mist_berry' : pick(['naraku_take', 'naraku_take', 'kotoko_mugi', 'meifu_root'])}); break;
  }
  const mc = cp || v === 'garden' ? 0 : v === 'den' ? 7 : 1 + (Math.random() < .6 ? 1 : 0) + (Math.random() < .4 ? 1 : 0), sc = deepSc(f);
  fl.mons = [];
  for (let i = 0; i < mc; i++) { const k = pick(DEEP_MONS), m = MONT[k], p = randWalk(fl);
    fl.mons.push({k, x:p[0], y:p[1], hp:Math.round(m.hp * sc), max:Math.round(m.hp * sc), atk:Math.round(m.atk * sc), spd:m.spd, cd:0, kb:0, wait:rnd(0, 2), path:[]}); }
  if (f > M.max && f > 51 && f % 10 === 1) { M.hpMax += 10; M.hp = Math.min(M.hpMax, M.hp + 10); }
}
function deepStone(rk) {
  const ch = FL.v === 'vein' ? .25 : FL.v === 'mist' ? .12 : .06;
  if (Math.random() < ch) { const id = FL.v === 'mist' && Math.random() < .5 ? 'mist_berry' : 'stardust_salt'; giveBag('i', id, false, 1); tripAdd(id, 1); S.known.i[id] = true; floatAt(rk.x + 8, rk.y - 10, ingName(id) + ' +1', 'info'); }
}
function deepKill(m) {
  if (Math.random() < (FL.v === 'den' ? .6 : .25)) { giveBag('i', 'deep_beast', false, 1); tripAdd('deep_beast', 1); S.known.i.deep_beast = true; floatAt(m.x, m.y - 18, '深層獣の肉 +1', 'info'); }
  if (Math.random() < .08) { giveBag('i', 'naraku', false, 1); tripAdd('naraku', 1); mineState().ever.naraku = true; S.known.i.naraku = true; floatAt(m.x, m.y - 24, '奈落晶 +1', 'info'); }
}
function deepChest() {
  const f = FL.f, gold = Math.round((600 + Math.random() * 600) * deepSc(f)), nk = 1 + (Math.random() < .5 ? 1 : 0) + (FL.v === 'dark' ? 1 : 0);
  FL.chest.open = true; S.gold += gold; giveBag('i', 'naraku', false, nk); tripAdd('naraku', nk); mineState().ever.naraku = true; S.known.i.naraku = true;
  const id = pick(['naraku_take', 'kotoko_mugi', 'meifu_root', 'mist_berry', 'stardust_salt', 'deep_beast']); giveBag('i', id, false, 2); tripAdd(id, 2); S.known.i[id] = true;
  sfx('ok'); toast(`宝箱から ${fmt(gold)}G・奈落晶×${nk}・${ingName(id)}×2 を手に入れた！`, 4000); if (unl('arms') && Math.random() < .5 * accMul('luck')) rollGearDrop(FL, 1); if (unl('arms') && FL.f >= 100 && Math.random() < .03) rollGearDrop(FL, 4, true); legRoll(.03, 'naraku_kinoko', '奈落の宝箱に入っていた。'); FL.chest = null; buildMineWalk();
}
function pickPlant(p) {
  FL.plants = FL.plants.filter(x => x !== p); const n = 1 + (Math.random() < .35 ? 1 : 0);
  giveBag('i', p.id, false, n); tripAdd(p.id, n); S.known.i[p.id] = true; sfx('pop'); floatAt(p.x + 6, p.y - 6, `${ingName(p.id)} +${n}`, 'info'); dirty = true;
}
function drawDeepUnder() {
  if (!FL || !FL.plants) return [];
  return FL.plants.map(p => ({y:p.y + 10, f:() => { const g = .5 + .5 * Math.sin(tNow * 3 + p.x);
    ctx.fillStyle = `rgba(150,240,220,${.12 + .1 * g})`; ctx.beginPath(); ctx.ellipse(p.x + 6, p.y + 11, 8, 3, 0, 0, 7); ctx.fill();
    drawIcon(ING[INGI[p.id]].icon, p.x, p.y, 12, 'world'); }}));
}
function drawAbyssTop() {
  if (scene !== 'mine' || !FL || !FL.v) return;
  if (FL.v === 'mist') for (let i = 0; i < 9; i++) { const x = ((i * 47 + tNow * (5 + i % 3)) % 200) - 30, y = 50 + i * 22 + Math.sin(tNow * .7 + i) * 4;
    ctx.fillStyle = 'rgba(120,200,90,.10)'; ctx.beginPath(); ctx.ellipse(x, y, 34, 9, 0, 0, 7); ctx.fill(); }
  if (FL.v === 'dark') { const r = (gearAccOn('neck_eye') || buffOn('p_night') ? 64 : 34) + Math.sin(tNow * 2) * 1.5, g = ctx.createRadialGradient(player.x, player.y - 8, r * .45, player.x, player.y - 8, r * 1.25);
    g.addColorStop(0, 'rgba(4,3,8,0)'); g.addColorStop(1, 'rgba(4,3,8,.97)'); ctx.fillStyle = g; ctx.fillRect(-10, -10, 170, 290); }
}
function deepEnterMsg(f) {
  if (!FL || !FL.v) return;
  tut('abyss');
  if (FL.v !== 'deep') toast(`🕳 B${f}：<b>${DEEP_VN[FL.v]}</b>　${DEEP_VD[FL.v]}`, 3500);
  if (f % 10 === 1 && f > 51) toast(`💪 深く潜った。最大体力 +10。魔物がさらに強くなる（×${deepSc(f).toFixed(2)}）`, 3500);
}
function forgeDeepHTML() {
  if (!unl('abyss')) return '';
  const s = S.forgeS || 0, a = S.forgeA || 0, needS = {naraku:2 + s}, feeS = 20000 * (s + 1), needA = {naraku:2 + a}, feeA = 20000 * (a + 1);
  return `<div class="h">鍛え直し（奈落晶で上限なく強くする）</div>
    <div class="row"><div class="t"><b>剣の鍛え直し ＋${s} → ＋${s + 1}</b><span>攻撃 +12%ずつ（いま +${s * 12}%）　${needHTML(needS)}　${fmt(feeS)}G</span></div><div class="btn ${needOk(needS) && S.gold >= feeS ? '' : 'dis'}" data-fs="1">鍛える</div></div>
    <div class="row"><div class="t"><b>防具の鍛え直し ＋${a} → ＋${a + 1}</b><span>受けるダメージ ÷(1＋0.1×段階)（いま -${Math.round((1 - forgeMulA()) * 100)}%）　${needHTML(needA)}　${fmt(feeA)}G</span></div><div class="btn ${needOk(needA) && S.gold >= feeA ? '' : 'dis'}" data-fa="1">鍛える</div></div>`;
}
// v0.52.5：鍛冶屋の修理（市場の修理の半額以下。買い直し・強化よりずっと安い）
const repairCost = t => { const tl = TOOLI[t.id], mx = TOOL_DUR[t.id]; return t.dur >= mx ? 0 : Math.max(1, Math.round((tl.price || 80) * .2 * (1 - t.dur / mx))); };
function forgeRepairHTML() {
  const ts = S.toolInv.filter(t => t.dur < TOOL_DUR[t.id]); const all = ts.reduce((a, t) => a + repairCost(t), 0);
  return `<div class="h">⚒ 修理（市場の修理の4割の値段）</div>` + (ts.length ? ts.map(t => { const tl = TOOLI[t.id], mx = TOOL_DUR[t.id], c = repairCost(t);
    return `<div class="row">${icHTML(tl.icon, U * 10, 'atlas', null, 't:' + tl.id)}<div class="t"><b>${tl.name}${t.dur <= 0 ? ' <span style="color:#e88">💥壊れている</span>' : ''}</b><span>耐久 ${t.dur}/${mx}　新品 ${fmt(tl.price || 80)}G</span></div><div class="btn ${S.gold >= c ? 'grn' : 'dis'}" data-fr="${t.uid}">${fmt(c)}G</div></div>`; }).join('')
    + (ts.length > 1 ? `<div class="btn big ${S.gold >= all ? 'grn' : 'dis'}" data-fr="all" style="margin-bottom:${U * 1.4}px">全部修理する（${fmt(all)}G）</div>` : '') : '<div class="p">修理が必要な道具はない。</div>');
}
const oreBuyP = k => Math.max(4, Math.round(ING[INGI[k]].value * 1.6));
function forgeOreHTML() {
  const M = mineState(), ev = ROCKS.filter(k => k !== 'stone' && (k === 'coal' || (M.ever && M.ever[k])));
  return `<div class="p">一度掘った鉱石だけ。掘るより高め（石炭はいつでも）。</div>` + mkNHTML() + ev.map(k => { const p = oreBuyP(k); return `<div class="row">${ingIc(k, U * 9)}<div class="t"><b>${ingName(k)}</b><span>${p}G　所持 ${haveIng(k)}</span></div><div class="btn ${S.gold >= p * mkN ? '' : 'dis'}" data-ob="${k}:${mkN}">×${mkN}<br>${fmt(p * mkN)}G</div></div>`; }).join('');
}
function bindForgeRepair(a) {
  bindMkN(() => openForge(a));
  bind('[data-ob]', d => { const [k, n] = d.ob.split(':'), c = oreBuyP(k) * +n; if (S.gold < c) return; S.gold -= c; add(S.inv, k, +n); S.known.i[k] = true; sfx('coin'); dirty = true; toast(`${ingName(k)}×${n}を買った（倉庫へ）`); openForge(a); });
  bind('[data-fr]', d => { const list = d.fr === 'all' ? S.toolInv.filter(t => t.dur < TOOL_DUR[t.id]) : [S.toolInv.find(t => t.uid === +d.fr)].filter(Boolean);
    const c = list.reduce((x, t) => x + repairCost(t), 0); if (!list.length || S.gold < c) return; S.gold -= c; list.forEach(t => { const br = t.dur <= 0; t.dur = TOOL_DUR[t.id]; if (br) giveTool(t.uid); });
    sfx('ok'); dirty = true; renderHot(); toast(`ガルド「ほれ、新品同様だ」（${fmt(c)}G）`); openForge(a); });
}
function bindForgeDeep(a) {
  bind('[data-fs]', () => { const s = S.forgeS || 0, need = {naraku:2 + s}, fee = 20000 * (s + 1); if (!needOk(need) || S.gold < fee) return; takeIng('naraku', false, need.naraku); S.gold -= fee; S.forgeS = s + 1; sfx('ok'); tut('abyss_forge'); toast(`ガルド「剣を＋${s + 1}に鍛え直した。奈落の底まで斬れるぞ」`, 3000); openForge(a); });
  bind('[data-fa]', () => { const s = S.forgeA || 0, need = {naraku:2 + s}, fee = 20000 * (s + 1); if (!needOk(need) || S.gold < fee) return; takeIng('naraku', false, need.naraku); S.gold -= fee; S.forgeA = s + 1; sfx('ok'); tut('abyss_forge'); toast(`ガルド「防具を＋${s + 1}に鍛え直した」`, 3000); openForge(a); });
}

const TOWER_RI = new Set(['勝利のローストチキン', '闘技場のミートパイ', '塔頂のフルーツタルト', '階の主のフルコース'].map(n => REC.findIndex(r => r.name === n)));
// ===== v0.32: 決闘の塔（無限）
const TW_TIER_N = ['石の間', '銅の間', '銀の間', '金の間', '黒曜の間'];
const twTier = fl => Math.min(4, Math.floor((fl - 1) / 10));
const TW_TITLE = ['見習い', '旅の', '港の', '宮廷の', '路地裏の', '山の', '砂漠の', '雪国の', '異国の', '流しの', '腹ぺこの', '仮面の'];
const TW_JOB = ['料理人', '菓子職人', '肉料理人', '魚料理人', '屋台の主', '鍋奉行', 'パン職人', '香辛料使い', '包丁使い', '火の番'];
const TW_NAME = ['ルカ', 'ミオ', 'ガロ', 'セナ', 'ドド', 'イリス', 'バルト', 'ノノ', 'ザザ', 'エルマ', 'カイ', 'フィン', 'モモ', 'グレタ', 'ヤン', 'ロロ'];
const TW_K = ['hood', 'witch', 'traveler', 'knight', 'beard', 'noble', 'lizard', 'demon'];
const TW_PATS = [
  [['atk', 6], ['def', 6], ['atk', 8]], [['atk', 7], ['buf', 2], ['atk', 5, 2], ['def', 8]], [['atk', 10], ['wk', 2], ['atk', 6, 2], ['def', 9]],
  [['buf', 3], ['atk', 8, 2], ['def', 11], ['atk', 14]], [['atk', 5, 3], ['def', 7], ['atk', 12]], [['wk', 2], ['atk', 9], ['atk', 9], ['def', 10]],
];
function towerState() { if (!S.tower) S.tower = {best:0, medals:0, runs:0, pts:{}, bought:{}}; return S.tower; }
const twLv = ri => Math.floor(((S.tower && S.tower.pts[ri]) || 0) / 10);
function towerFoe(fl) {
  const r = (fl * 9301 + 49297) % 233280, rr = k => Math.floor(((r * (k + 1)) % 233280) / 233280 * 1000);
  const boss = fl % 10 === 0, sc = Math.pow(1.05, fl - 1);
  const name = boss ? `${TW_TIER_N[twTier(fl)]}の主 ${TW_NAME[rr(3) % TW_NAME.length]}` : `${TW_TITLE[rr(1) % TW_TITLE.length]}${TW_JOB[rr(2) % TW_JOB.length]} ${TW_NAME[rr(3) % TW_NAME.length]}`;
  let pat = TW_PATS[rr(4) % TW_PATS.length].map(p => p.slice());
  if (boss) pat = [['buf', 3], ['atk', 12], ['wk', 2], ['atk', 7, 3], ['def', 14], ['atk', 20]];
  return {n:name, k:boss ? 'demon' : TW_K[rr(5) % TW_K.length], hp:Math.round((44 + fl * 3) * (boss ? 1.7 : 1)), pat, boss, sc};
}
function towerMenu() {
  if (!unl('tower')) return; const T = towerState(), D = S.duelS; tut('tower');
  const ext = IMG.tower_ext ? `<img src="${IMG.tower_ext.src}" style="float:right;width:calc(var(--u)*30);image-rendering:pixelated;margin:0 0 4px 6px;border-radius:3px">` : '';
  const html = `${ext}<div class="p">町はずれの丘に建つ、終わりのない<b>決闘の塔</b>。1階ごとに1人と料理決闘をして、勝つと上の階へ。<br>10階ごとに「階の主」。気力は階をまたいで持ち越し、5階ごとに全回復。<b>負けたら1階からやり直し</b>。</div>
    <div class="p">最高記録：<b>${T.best}階</b>　塔のメダル：<b>${T.medals}枚</b>　挑戦 ${T.runs}回</div>
    <div style="clear:both"></div><div class="btn big grn" data-tw="go">⚔ 1階から登る（デッキ${D.deck.length}枚）</div>
    <div class="btn" data-tw="kitchen" style="display:block;text-align:center;margin-top:calc(var(--u)*1.4)">🔥 塔の厨房（カードを鍛える）</div>
    <div class="btn" data-tw="shop" style="display:block;text-align:center;margin-top:calc(var(--u)*1.4)">🏅 塔の交換所（メダルと交換）</div>
    <div class="btn" data-tw="back" style="display:block;text-align:center;margin-top:calc(var(--u)*1.4)">デッキを組む（料理決闘の画面へ）</div>`;
  modal('決闘の塔', html, 'tower');
  bind('[data-tw]', d => { if (d.tw === 'go') { if (D.deck.length < 8) return toast('デッキは8枚以上必要'); closeModal(); startTower(); } else if (d.tw === 'kitchen') towerKitchen(); else if (d.tw === 'shop') towerShop(); else openDuelMenu(); });
}
function startTower() {
  const T = towerState(), D = S.duelS; T.runs++;
  duel = {tower:true, floor:1, stage:0, lvl:0, hpMax:50 + 10 * rankIdx() + (outfitOn('tower') ? 10 : 0), deck:D.deck.slice(), got:{medals:0, gold:0}};
  duel.hp = duel.hpMax; towerBg(); $('duelv').classList.add('show'); sfx('door'); nextFoe(); $('dplate').innerHTML = '';
}
function towerBg() { const im = IMG['tower_a' + twTier(duel.floor)]; const v = $('duelv'); if (im) { v.style.background = `#08060a url(${im.src}) center top / cover no-repeat`; v.style.imageRendering = 'pixelated'; } }
function towerWin() {
  const T = towerState(), fl = duel.floor, boss = fl % 10 === 0; duel.state = 'reward'; sfx('ok');
  const med = 1 + (boss ? 5 : 0) + Math.floor(fl / 20), gold = Math.round(60 * fl * (1 + fl / 25));
  if (fl >= 20) legRoll(.05, 'tenro', '塔の頂から露がこぼれ落ちてきた。');
  T.medals += med; S.gold += gold; duel.got.medals += med; duel.got.gold += gold; T.best = Math.max(T.best, fl); dirty = true;
  let extra = '';
  if (boss) { const id = pick(['truffle', 'caviar', 'moon_extract', 'saffron', 'phoenix_egg']), n = 1 + Math.floor(fl / 30); add(S.inv, id, n); S.known.i[id] = true; extra = `<br>階の主の贈り物：${ingName(id)}×${n}（倉庫へ）`; }
  duel.floor++; const heal = (duel.floor - 1) % 5 === 0;
  if (heal) duel.hp = duel.hpMax;
  const pool = REC.map((r, i) => i).filter(i => !SECRET_R.has(i) && !REC[i].ings.some(id => HYBS.has(id)) && !TOWER_RI.has(i) && !TOWN_RI.has(i)), opts = shuffle(pool).slice(0, 3);
  $('dres').innerHTML = `<div class="tcard"><div class="tth">⚔ ${fl}階 突破！${boss ? '（階の主）' : ''}</div><div class="ttx">塔のメダル +${med}　賞金 +${fmt(gold)}G${extra}${heal ? '<br>🌿 休憩の踊り場で気力が全回復した' : ''}<br>次は<b>${duel.floor}階</b>${duel.floor % 10 === 0 ? '（階の主）' : ''}。カードを1枚選ぶか、休む。</div>
    <div class="dcards">${opts.map(ri => cardHTML(cardOf(ri), S.known.r[ri] || S.learned[ri] ? '' : 'new', `data-rw="${ri}"`)).join('')}</div>
    <div class="btn" id="drest">カードの代わりに休む（気力を30%回復）</div><div class="btn" id="dquit" style="margin-top:4px">ここで塔を降りる（記録 ${T.best}階）</div></div>`;
  const go = () => { $('dres').innerHTML = ''; if ((duel.floor - 1) % 10 === 0) towerBg(); nextFoe(); $('dplate').innerHTML = ''; };
  $('dres').querySelectorAll('[data-rw]').forEach(el => el.onclick = () => { const ri = +el.dataset.rw; duel.deck.push(ri); if (!S.known.r[ri] && !S.learned[ri]) { S.learned[ri] = true; toast(`レシピ『${REC[ri].name}』を覚えた！`); } go(); });
  $('drest').onclick = () => { duel.hp = Math.min(duel.hpMax, duel.hp + Math.round(duel.hpMax * .3)); go(); };
  $('dquit').onclick = () => towerEnd(false);
}
function towerEnd(lost) {
  const T = towerState(); duel.state = 'lost';
  $('dres').innerHTML = `<div class="tcard"><div class="tth">${lost ? '気力が尽きた……' : '塔を降りた'}</div><div class="ttx">${duel.floor - (lost ? 0 : 1)}階まで登った（最高記録 ${T.best}階）。<br>今回の稼ぎ：メダル ${duel.got.medals}枚・${fmt(duel.got.gold)}G<br>${lost ? '次は1階からやり直し。塔の厨房でカードを鍛えて、また挑もう。' : ''}</div><div class="btn big" id="dok">戻る</div></div>`;
  $('dok').onclick = () => { closeDuel(); towerMenu(); };
}
function towerKitchen() {
  const T = towerState(), D = S.duelS, dishes = allDishes();
  const cnt = ri => (dishes.find(x => x.k === 'r' + ri && !x.g) || {n:0}).n;
  const off = IMG.tower_off ? `<img src="${IMG.tower_off.src}" style="width:100%;image-rendering:pixelated;border-radius:3px">` : '';
  const html = `${off}<div class="p">その料理を<b>5皿</b>かまどに捧げると、カードが鍛えられる。品質★が高いほど伸びる（★1＝5、★2＝10、★3＝15、金色＝+2/皿。10ごとに＋1）。<b>上限なし</b>。＋1ごとに評価と守り +15%、＋3ごとに辛さ +1。</div><div class="h">デッキのカード</div>` +
    D.deck.map(ri => { const n = cnt(ri), lv = twLv(ri), p = T.pts[ri] || 0, q = qOf('r' + ri);
      return `<div class="row">${icHTML(REC[ri].icon, U * 11, 'atlas')}<div class="t"><b>${REC[ri].name} ＋${lv}</b><span>次の＋まで ${10 - p % 10}　持っている皿 ${n}（${qStars(q)}）</span></div><div class="btn ${n >= 5 ? '' : 'dis'}" data-of="${ri}">捧げる</div></div>`; }).join('');
  modal('塔の厨房', html, 'towerk');
  bind('[data-of]', d => { const ri = +d.of; if (cnt(ri) < 5) return toast('この料理が5皿必要（倉庫か持ち物に）'); const q = qOf('r' + ri);
    takeDish('r' + ri, false, 5); const before = twLv(ri); T.pts[ri] = (T.pts[ri] || 0) + Math.round(5 * q); dirty = true; sfx('ok'); tut('tower_k');
    toast(twLv(ri) > before ? `🔥 ${REC[ri].name}のカードが＋${twLv(ri)}になった！` : `${REC[ri].name}を捧げた（あと${10 - T.pts[ri] % 10}で＋${before + 1}）`, 3000); towerKitchen(); });
}
const TW_SHOP = [
  {id:'truffle', k:'ing', n:1, c:3}, {id:'caviar', k:'ing', n:1, c:3}, {id:'saffron', k:'ing', n:2, c:3}, {id:'moon_extract', k:'ing', n:1, c:5},
  {id:'naraku', k:'ing', n:1, c:6}, {id:'phoenix_egg', k:'ing', n:1, c:8},
  {id:'r:勝利のローストチキン', k:'rec', c:10}, {id:'r:闘技場のミートパイ', k:'rec', c:15}, {id:'r:塔頂のフルーツタルト', k:'rec', c:20}, {id:'r:階の主のフルコース', k:'rec', c:40},
  {id:'tower', k:'outfit', c:60},
];
function towerShop() {
  const T = towerState();
  const html = `<div class="p">塔のメダル：<b>${T.medals}枚</b>（1階ごとに1枚、階の主で+5、20階ごとに+1）</div>` + TW_SHOP.map((x, i) => {
    let nm, sub, done = false;
    if (x.k === 'ing') { nm = `${ingName(x.id)}×${x.n}`; sub = '食材'; }
    else if (x.k === 'rec') { const ri = REC.findIndex(r => r.name === x.id.slice(2)); nm = `レシピ『${REC[ri].name}』`; sub = '塔の交換所だけで覚えられる'; done = S.known.r[ri] || S.learned[ri]; }
    else { const o = OUTFITS.find(o => o.id === x.id); nm = `衣装「${o.n}」`; sub = o.d; done = S.outfits && S.outfits[x.id]; }
    return `<div class="row"><div class="calev">🏅${x.c}</div><div class="t"><b>${nm}</b><span>${sub}</span></div>${done ? '<div class="btn dis">交換済み</div>' : `<div class="btn ${T.medals >= x.c ? '' : 'dis'}" data-ts="${i}">交換</div>`}</div>`; }).join('');
  modal('塔の交換所', html, 'towers');
  bind('[data-ts]', d => { const x = TW_SHOP[+d.ts]; if (T.medals < x.c) return; T.medals -= x.c; dirty = true; sfx('ok');
    if (x.k === 'ing') { add(S.inv, x.id, x.n); S.known.i[x.id] = true; toast(`${ingName(x.id)}×${x.n}と交換した（倉庫へ）`); }
    else if (x.k === 'rec') { const ri = REC.findIndex(r => r.name === x.id.slice(2)); S.learned[ri] = true; toast(`レシピ『${REC[ri].name}』を覚えた！`); }
    else { if (!S.outfits) S.outfits = {}; S.outfits[x.id] = 1; toast('衣装「塔の覇者の外套」を手に入れた！ 内装の「衣装」で着られる'); }
    towerShop(); });
}
function drawTowerFar() { if (unl('tower') && IMG.tower_far) ctx.drawImage(IMG.tower_far, 66, 16); }

// ===== v0.33/v0.34: 遠征（港町シオカゼ・砂の町サハラン）
const PORT_RN = ['大トロの炙り寿司', '海ぶどう丼', 'オリーブとタコのマリネ', '黒胡椒のイカ焼き', '伊勢エビの鬼殻焼き', 'からすみパスタ', '港のアクアパッツァ', 'シナモンロール', '伊勢エビのテルミドール', '大トロのステーキ', '港の魚介パエリア', '交易船のスパイスカレー'];
const PORT_RI = PORT_RN.map(n => REC.findIndex(r => r.name === n));
const DESERT_RN = ['ラムのタジン鍋', 'クスクス', 'ファラフェル', 'ひよこ豆のフムス', 'ラムのシシケバブ', 'ザクロのサラダ', 'なつめやしの焼き菓子', 'ピスタチオのバクラヴァ', 'サハランのミントティー', 'スパイスピラフ', 'ひよこ豆のカレー', '砂の町の宴'];
const DESERT_RI = DESERT_RN.map(n => REC.findIndex(r => r.name === n));
const TEA_RN = ['葛餅の黒蜜がけ', '茶の里のおはぎ', '柚子胡椒の焼き鳥', '山椒香るうなぎ飯', '玉露の茶碗蒸し', '抹茶の白玉ぜんざい', '柚子蜜のかき氷', '抹茶のロールケーキ', '玉露の鮭茶漬け', '山椒の麻婆豆腐', '抹茶そば', '茶の里の懐石膳'];
const CAP_RN = ['王都のボルシチ', 'ニシンのライ麦サンド', '鹿肉のロースト コケモモ添え', 'ポルチーニのクリームスープ', 'ニシンの酢漬け', '王都のペリメニ', 'コケモモのパイ', 'ポルチーニのリゾット', 'ブランデーケーキ', '鹿肉の煮込み', 'キャビアのブリヌイ', '王宮の晩餐'];
const ISLE_RN = ['マンゴープリン', 'パイナップルの焼き飯', 'ロブスターのライム焼き', '南国のフルーツ盛り', 'バナナのフリッター', '島のココナッツカレー', 'イカのライムマリネ', 'パッションフルーツのタルト', 'カカオのホットチョコ', '青パパイヤのサラダ', 'ロブスターのココナッツ煮', 'ルルアの大祝宴'];
const TEA_RI = TEA_RN.map(n => REC.findIndex(r => r.name === n)), CAP_RI = CAP_RN.map(n => REC.findIndex(r => r.name === n)), ISLE_RI = ISLE_RN.map(n => REC.findIndex(r => r.name === n));
const TOWN_RI = new Set([...PORT_RI, ...DESERT_RI, ...TEA_RI, ...CAP_RI, ...ISLE_RI]);
const EXP_LV = [0, 300, 1000, 2500, 5000];
const EXP_TOWNS = [{id:'port', n:'港町シオカゼ', d:'海の幸と、遠い国からの交易品が集まる港町。'},
  {id:'desert', n:'砂の町サハラン', d:'オアシスのほとりの香辛料と菓子の町。夜はバザールでにぎわう。'}, {id:'tea', n:'茶の里ミドリ', d:'霧の山あいの茶畑の里。茶と和菓子、川魚の町。'}, {id:'capital', n:'雪の王都シルヴァ', d:'雪に包まれた王の都。狩りの肉と温かい煮込みの町。'}, {id:'isle', n:'南の果実島ルルア', d:'船で渡る南の島。果物と海の幸があふれている。'}];
const PORT_STALLS = [
  {n:'魚屋', items:[['tuna', 1], ['octopus', 1], ['squid', 1], ['ise_ebi', 2], ['kuromaguro', 3]]},
  {n:'香辛料屋', items:[['black_pepper', 1], ['cinnamon', 2], ['saffron', 3]]},
  {n:'青物屋', items:[['olive', 1], ['olive_oil', 1], ['lemon', 1], ['sea_grapes', 1]]},
  {n:'乾物と瓶詰め屋', items:[['sea_grapes', 1], ['kelp', 1], ['karasumi', 2], ['scallop', 2]]},
];
const DESERT_STALLS = [
  {n:'香辛料屋', items:[['cumin', 1], ['turmeric', 1], ['black_pepper', 1], ['cinnamon', 2], ['saffron', 3]]},
  {n:'なつめやしと木の実の店', items:[['dates', 1], ['pomegranate', 1], ['pistachio', 2]]},
  {n:'豆と穀物の店', items:[['chickpea', 1], ['couscous', 1], ['olive_oil', 1], ['yogurt', 1]]},
  {n:'香草とランプの店', items:[['mint', 1], ['tea', 1], ['rosewater', 2]]},
];
const TEA_STALLS = [
  {n:'茶問屋', items:[['tea', 1], ['gyokuro', 1], ['matcha', 2]]},
  {n:'和菓子の材料屋', items:[['azuki', 1], ['mochigome', 1], ['kuromitsu', 1], ['kuzu', 2]]},
  {n:'薬味と山の幸', items:[['yuzu', 1], ['sansho', 1], ['shiitake', 1], ['bamboo', 2]]},
  {n:'川魚屋', items:[['trout', 1], ['salmon', 1], ['eel', 2]]},
];
const CAP_STALLS = [
  {n:'狩人の肉屋', items:[['venison', 1], ['duck', 1], ['sausage', 1], ['ham', 2]]},
  {n:'王都の八百屋', items:[['beet', 1], ['potato', 1], ['cranberry', 1], ['porcini', 2]]},
  {n:'魚と瓶詰めの店', items:[['herring', 1], ['sourcream', 1], ['salmon', 1], ['caviar', 3]]},
  {n:'パンと酒の店', items:[['rye', 1], ['cheese', 1], ['butter', 1], ['brandy', 2], ['truffle', 3]]},
];
const ISLE_STALLS = [
  {n:'果物屋', items:[['mango', 1], ['pineapple', 1], ['banana', 1], ['papaya', 1], ['passion', 2]]},
  {n:'浜の魚屋', items:[['shrimp', 1], ['squid', 1], ['tuna', 1], ['lobster', 2]]},
  {n:'椰子とカカオの店', items:[['coconut', 1], ['cacao', 2], ['vanilla', 3]]},
  {n:'南の香草屋', items:[['lime', 1], ['chili', 1], ['ginger', 1], ['dragonfruit', 3]]},
];
const ISLE_FRUITS = ['mango', 'pineapple', 'papaya', 'passion', 'banana', 'lime'];
const TEAISH = new Set(['tea', 'matcha', 'gyokuro', 'azuki', 'mochigome', 'kuromitsu', 'kuzu', 'yuzu', 'sansho']);
const FRUIT_IDS = new Set([...ISLE_FRUITS, ...ING.filter(g => g.src[0] === 'tree').map(g => g.id), 'strawberry', 'blueberry', 'coconut', 'dragonfruit', 'cranberry', 'pomegranate', 'dates', 'yuzu']);
const SEA_IDS = new Set([...ING.filter(g => ['pier', 'pond', 'nushi'].includes(g.src[0])).map(g => g.id), 'tuna', 'octopus', 'squid', 'shrimp', 'scallop', 'kelp', 'uni', 'crab', 'kuromaguro', 'ise_ebi', 'karasumi', 'sea_grapes']);
const SPICE_IDS = new Set(['cumin', 'turmeric', 'black_pepper', 'cinnamon', 'saffron', 'chili', 'spice', 'ginger', 'magma_pepper']);
const SWEET_IDS = new Set(['sugar', 'honey', 'dates', 'chocolate', 'rosewater', 'pistachio', 'vanilla']);
const SWEET_ST = new Set(['tart', 'pie', 'pudding', 'custard', 'donut', 'pancake']);
const TOWNC = {
  port:{n:'港町シオカゼ', ic:'⚓', ri:PORT_RI, stalls:PORT_STALLS, x:[4, 40, 76, 110], inn:'宿屋「潮騒」', innPos:[124, 268], arrive:[90, 300], tutSc:'sc_port',
    like:'<b>魚介の料理（×1.35）</b>と<b>港の料理（×1.6）</b>', likeTag:'🐟好まれる', isLike:r => r.ings.some(id => SEA_IDS.has(id)),
    diner:'港の食堂', dinerTalk:'港の食堂のおかみ「宵闇亭の料理人さんかい？ うちの料理、教えてあげるよ。お代はもらうけどね」',
    tradeTalk:'交易所の親方「シオカゼでは手に入らない物を探してる。今日の『求む』は高く買うよ」',
    wantSrc:['forage', 'cellar', 'deep', 'mine', 'night', 'tree', 'pond']},
  desert:{n:'砂の町サハラン', ic:'🐪', ri:DESERT_RI, stalls:DESERT_STALLS, x:[4, 40, 76, 110], inn:'宿屋「砂の月」', innPos:[123, 268], arrive:[72, 300], tutSc:'sc_desert',
    like:'<b>香辛料の料理・甘い菓子（×1.35）</b>と<b>砂の町の料理（×1.6）</b>', likeTag:'🌶好まれる', isLike:r => r.ings.some(id => SPICE_IDS.has(id) || SWEET_IDS.has(id)) || SWEET_ST.has(r.style),
    diner:'ドームの食堂', trN:'キャラバン宿（交易所）', dinerTalk:'食堂の主人「遠くから来たね。砂の町の料理を覚えていくといい。もちろんタダじゃないがね」',
    tradeTalk:'キャラバン宿の商人「砂漠では、海の物や森の物がとても珍しい。今日の『求む』は高く買おう」',
    wantSrc:['forage', 'pier', 'pond', 'deep', 'cellar', 'tree', 'town:port']},
  tea:{n:'茶の里ミドリ', ic:'🍵', ri:TEA_RI, stalls:TEA_STALLS, inn:'宿「山茶花」', innPos:[123, 268], arrive:[72, 300], tutSc:'sc_tea',
    like:'<b>茶や和菓子の材料を使う料理・蒸し料理（×1.35）</b>と<b>茶の里の料理（×1.6）</b>', likeTag:'🍵好まれる', isLike:r => r.ings.some(id => TEAISH.has(id)) || r.method === '蒸す',
    diner:'茶屋「みどり」', trN:'問屋（交易所）', dinerTalk:'茶屋の女将「あら、遠くからようこそ。お茶に合う料理、お教えしましょうか。お代はいただきますけどね」',
    tradeTalk:'問屋の番頭「山の里では、海の物や砂漠の香辛料が手に入りません。今日の『求む』は高く買いますよ」',
    wantSrc:['pier', 'mine', 'deep', 'cellar', 'town:port', 'town:desert']},
  capital:{n:'雪の王都シルヴァ', ic:'🏰', ri:CAP_RI, stalls:CAP_STALLS, inn:'宿屋「白樺亭」', innPos:[123, 268], arrive:[72, 300], tutSc:'sc_capital',
    like:'<b>温かい煮込み・スープ（煮る料理）（×1.35）</b>と<b>王都の料理（×1.6）</b>', likeTag:'🔥好まれる', isLike:r => r.method === '煮る',
    diner:'王都の食堂', trN:'商館（交易所）', dinerTalk:'食堂の料理長「ほう、田舎の名店の主か。王都の味、覚えて帰るといい。授業料はいただくがな」',
    tradeTalk:'商館の会計係「冬の王都には、南の果物や香辛料、茶が届きにくい。今日の『求む』は高く買い取ろう」',
    wantSrc:['tree', 'forage', 'night', 'town:desert', 'town:tea', 'town:port']},
  isle:{n:'南の果実島ルルア', ic:'🏝', ri:ISLE_RI, stalls:ISLE_STALLS, inn:'浜の宿「さんご」', innPos:[123, 268], arrive:[72, 300], tutSc:'sc_isle',
    like:'<b>果物を使う料理（×1.35）</b>と<b>島の料理（×1.6）</b>', likeTag:'🍍好まれる', isLike:r => r.ings.some(id => FRUIT_IDS.has(id)),
    diner:'浜の食堂', trN:'交易小屋', dinerTalk:'食堂のおばあ「よう来たねえ。島のごはん、教えてあげようねえ。お代はちゃんともらうよ」',
    tradeTalk:'交易小屋の船乗り「島じゃあ山の物も雪の国の物も珍しい。今日の『求む』は高く買うぜ」',
    wantSrc:['mine', 'cellar', 'deep', 'forage', 'town:capital', 'town:tea']},
};
const TOWN_SHORT = {port:'シオカゼ', desert:'サハラン', tea:'ミドリ', capital:'シルヴァ', isle:'ルルア'};
function curTown() { const a = expState().at; return TOWNC[a] ? a : 'port'; }
function isNightBazaar() { const h = hmNow(); return h >= 17 * 60 || h < 120; }
function expState() { if (!S.exp) S.exp = {xp:{port:0}, day:{}, at:null, seen:{}}; return S.exp; }
function expLv(t) { const x = (expState().xp[t] || 0); let l = 1; for (let i = 1; i < EXP_LV.length; i++) if (x >= EXP_LV[i]) l = i + 1; return l; }
function expAddXp(t, n) {
  const E = expState(), b = expLv(t); E.xp[t] = (E.xp[t] || 0) + Math.round(n * (S.ult ? 1 + ultPerm('rep') : 1)); const a = expLv(t); dirty = true;
  if (a > b) { sfx('ok'); const C_ = TOWNC[t], ti = EXP_TOWNS.findIndex(e => e.id === t), nt = ti >= 0 ? EXP_TOWNS[ti + 1] : null, nx = t === 'mirror' ? '' : nt ? `目標を達成すると<b>次の町「${nt.n}」への道が開く</b>。` : '5つの町すべてで評判Lv3。遠征の旅はひとまず完成だ！';
    popStory(`<div class="tth">${C_.ic} ${C_.n}の評判が Lv${a} に上がった！</div><div class="ttx">${a === 2 ? '食堂で新しいレシピを教われるようになり、市場の品も増えた。' : a === 3 ? '食堂の奥の料理と、市場の珍しい品が並ぶようになった。<br>' + nx : a === 4 ? '市場の品が1割引になった。屋台の値段も少し上がる。' : '市場の品が2割引になった。町の人たちはもう宵闇亭の常連だ。'}</div>`); }
}
function expToday(t) { const E = expState(), d = gday(); if (!E.day[t] || E.day[t].d !== d) E.day[t] = {d, stall:0, trade:{}}; return E.day[t]; }
function townOpen(t) { return t === 'port' ? unl('expedition') : TOWNC[t] ? unl(t) : false; }
function expTravelTo(dest) {
  closeModal(); $('fade').style.opacity = 1; sleeping = true;
  setTimeout(() => {
    const target = (gday() + 1) * 1440 + 600, g0 = S.gold; rep_ = {}; simulating = true;
    let left = Math.max(60, target - S.t); while (left > 0) { const dd = Math.min(2, left); step(dd, false); left -= dd; }
    simulating = false; const r = rep_; r.gold = S.gold - g0;
    const E = expState(); E.at = dest === 'home' ? null : dest;
    if (dest === 'home') go('outside', 72, 308); else go(dest, TOWNC[dest].arrive[0], TOWNC[dest].arrive[1]);
    $('fade').style.opacity = 0; sleeping = false; dirty = true; lastLogic = Date.now();
    const parts = []; if (r.sold) parts.push(`宵闇亭では料理が ${r.sold}皿 売れた（${fmt(r.earned)}G）`); if (r.branch) parts.push(`支店の売上 ${fmt(r.branch)}G`); if (r.spent) parts.push(`仕入れに ${fmt(r.spent)}G`);
    setTimeout(() => popStory(`<div class="tth">${dest === 'home' ? '🏠 宵闇亭に帰ってきた' : TOWNC[dest].ic + ' ' + TOWNC[dest].n + 'に着いた'}</div><div class="ttx">${monthName()} ${dayInMonth()}日の朝10時。馬車で1日かかった。<br>${parts.length ? '留守のあいだ（従業員が店を回した）：<br>' + parts.join('<br>') : '留守のあいだ、店は静かだった。'}</div>`), 450);
    if (dest !== 'home') setTimeout(() => tut(TOWNC[dest].tutSc), 900);
  }, 400);
}
function openExpMap() {
  if (!unl('expedition')) return gateMsg('expedition'); tut('expedition');
  const E = expState(), at = E.at;
  const rows = EXP_TOWNS.map((t, i) => { const ok = townOpen(t.id), C_ = TOWNC[t.id];
    const pv = i > 0 ? EXP_TOWNS[i - 1] : null, pvOpen = pv && townOpen(pv.id);
    const lock = !pvOpen ? 'まだ道が分からない' : expLv(pv.id) >= 3 ? `目標「${pv.n}の評判Lv3」を達成すると道が開く` : `${pv.n}の評判Lv3で道が開く`;
    return `<div class="row"><div class="calev">${ok ? C_.ic : '🔒'}</div><div class="t"><b>${t.n}</b><span>${ok ? `${t.d}　町の評判 Lv${expLv(t.id)}` : lock}</span></div>${ok ? (at === t.id ? '<div class="btn dis">いまここ</div>' : `<div class="btn grn" data-ex="${t.id}">出発</div>`) : ''}</div>`; }).join('');
  const nOpen = EXP_TOWNS.filter(t => townOpen(t.id)).length, mp = (nOpen > 1 && IMG['exp_map' + nOpen]) || IMG.exp_map;
  modal('遠征の地図', `<img src="${mp.src}" style="width:100%;image-rendering:pixelated;border-radius:4px"><div class="p">馬車（南の島へは船）で<b>1日</b>かかる（着くのは次の日の朝10時）。町から町へも1日。留守のあいだも、従業員が店を回す。町では宿屋で眠って、何日でも滞在できる。</div>${rows}
    ${at && unl('dungeon') && dgOfTown(at) ? `<div class="btn big red" data-a="dgn" style="margin-top:4px">⚔ 専用ダンジョン「${DGD[dgOfTown(at)].n}」へ</div>` : ''}${unl('caravan') ? '<div class="btn big blu" data-a="cara" style="margin-top:4px">🐫 交易キャラバン</div>' : ''}${at ? '<div class="btn big" data-ex="home" style="margin-top:4px">宵闇亭へ帰る（1日）</div>' : ''}`, 'expmap');
  bind('[data-a=cara]', () => openCaravan());
  bind('[data-a=dgn]', () => openDgEntry(dgOfTown(expState().at), expState().at));
  bind('[data-ex]', d => { if (d.ex === 'home') expTravelTo('home'); else expTravelTo(d.ex); });
}
function expPrice(id) { const lv = expLv(curTown()); return Math.max(1, Math.round(ING[INGI[id]].value * 1.3 * (lv >= 5 ? .8 : lv >= 4 ? .9 : 1))); }
function openPortStall(i) {
  const t = curTown(), C_ = TOWNC[t], st = C_.stalls[i], lv = expLv(t);
  st.items.forEach(([id, need]) => { if (need <= lv) S.known.i[id] = true; });
  const html = `<div class="p">${TOWN_SHORT[t]}の${st.n}。町の評判が上がると品が増える（いま Lv${lv}）。</div>` + st.items.map(([id, need]) => need > lv
    ? `<div class="row" style="opacity:.45"><div class="calev">🔒</div><div class="t"><b>？？？</b><span>町の評判Lv${need}で並ぶ</span></div></div>`
    : `<div class="row">${ingIc(id, U * 11)}<div class="t"><b>${ingName(id)}</b><span>${fmt(expPrice(id))}G　持っている ${haveIng(id)}</span></div><div class="btn" data-pb="${id}:1">1</div><div class="btn" data-pb="${id}:5">5</div></div>`).join('');
  modal(st.n, html, 'pstall');
  bind('[data-pb]', d => { const [id, ns] = d.pb.split(':'), n = +ns, c = expPrice(id) * n; if (S.gold < c) return toast('お金が足りない'); S.gold -= c; add(S.inv, id, n); S.known.i[id] = true; sfx('ok'); dirty = true; toast(`${ingName(id)}×${n}を買った（倉庫へ）`); openPortStall(i); });
}
function portDishMul(key, t) { t = t || curTown(); const ri = +key.slice(1); if (TOWNC[t].ri.includes(ri)) return 1.6; return TOWNC[t].isLike(REC[ri]) ? 1.35 : .9; }
function stallCap(t) { const lv = expLv(t), base = 20 + 10 * (lv - 1) + (gearAccOn('neck_compass') ? 10 : 0); return t === 'desert' && isNightBazaar() ? Math.round(base * 1.5) : base; }
function stallMul(t) { return (1 + .05 * (expLv(t) - 1)) * (t === 'desert' && isNightBazaar() ? 1.3 : 1); }
function openExpStallSell() {
  const t = curTown(), C_ = TOWNC[t], T = expToday(t), lv = expLv(t), cap = stallCap(t), left = Math.max(0, cap - T.stall), items = allDishes().filter(x => x.k[0] === 'r');
  tut('exp_stall'); if (t === 'desert') tut('exp_night');
  const nb = t === 'desert' ? (isNightBazaar() ? '<br>🌙 <b>夜のバザール</b>の時間！ 値段×1.3、売れる数も1.5倍。' : '<br>☀ 昼は暑くて人通りが少ない。<b>夕方17時から</b>は夜のバザール（値段×1.3・売れる数1.5倍）。') : '';
  const html = `<div class="p">広場に屋台を出して、持ってきた料理を売る。この町の人は${C_.like}が好き。ほかの料理は×0.9。<br>今日はあと<b>${left}皿</b>売れる（評判Lv${lv}：1日${cap}皿）。売るほど町の評判が上がる。${nb}</div>` +
    (items.length ? items.map(x => { const p = Math.round(dval(x.k, x.g) * portDishMul(x.k, t) * stallMul(t));
      return `<div class="row">${dishIcHTML(x.k, U * 10, x.g)}<div class="t"><b>${x.g ? '金色の' : ''}${dishInfo(x.k).name} ×${x.n}</b><span>1皿 ${fmt(p)}G${portDishMul(x.k, t) > 1 ? '　' + C_.likeTag : ''}</span></div><div class="btn ${left > 0 ? '' : 'dis'}" data-ss="${x.k}:${x.g ? 1 : 0}:1">1</div><div class="btn ${left > 0 ? '' : 'dis'}" data-ss="${x.k}:${x.g ? 1 : 0}:${Math.max(1, Math.min(x.n, left))}">全部</div></div>`; }).join('') : '<div class="p">料理を持っていない（倉庫・カバン・持ち物の料理を売れる）。</div>');
  modal('自分の屋台', html, 'estall');
  bind('[data-ss]', d => { const [k, g, ns] = d.ss.split(':'), gg = g === '1', T2 = expToday(t), lft = stallCap(t) - T2.stall, n = Math.min(+ns, lft); if (n <= 0) return toast(t === 'desert' && !isNightBazaar() ? '昼の分は売り切れ。夕方17時からの夜のバザールでまた売れる' : '今日はもう売り切れ。宿屋で眠ると次の日');
    let sold = 0; for (let i = 0; i < n; i++) { if (!takeDish(k, gg, 1)) break; sold++; } if (!sold) return;
    const p = Math.round(dval(k, gg) * portDishMul(k, t) * stallMul(t)) * sold; S.gold += p; S.stat.earned = (S.stat.earned || 0) + p; T2.stall += sold; if (lv >= 4 && TOWN_LEG[t] && ['port', 'desert'].includes(t)) legRoll(.01 * sold, TOWN_LEG[t], '屋台の常連客が、お礼にとっておきをくれた。'); sfx('coin'); toast(`${dishInfo(k).name}×${sold} が売れた！ +${fmt(p)}G`); expAddXp(t, Math.round(p / 20)); openExpStallSell(); });
}
function portWanted(t) {
  t = t || curTown(); const ws = TOWNC[t].wantSrc, d = gday();
  const pool = ING.filter(g => (ws.includes(g.src[0]) || ws.includes(g.src[0] + ':' + g.src[1])) && g.value >= 15).map(g => g.id);
  const out = []; let s = d * 7919 + 13 + (t === 'port' ? 0 : 4241); while (out.length < 3 && pool.length) { s = (s * 16807) % 2147483647; const id = pool[s % pool.length]; if (!out.includes(id)) out.push(id); } return out;
}
function openPortTrade() {
  const t = curTown(), C_ = TOWNC[t], T = expToday(t), lv = expLv(t), wants = portWanted(t); tut('exp_trade');
  const html = `<div class="p">${C_.tradeTalk}<br>1品につき1日5個まで。値段は普通の<b>2.5倍</b>${lv >= 3 ? '（評判Lv3以上で3倍）' : ''}。</div>` + wants.map(id => { const got = T.trade[id] || 0, p = Math.round(ING[INGI[id]].value * (lv >= 3 ? 3 : 2.5)), h = haveIng(id);
    return `<div class="row">${ingIc(id, U * 11)}<div class="t"><b>求む：${ingName(id)}</b><span>1個 ${fmt(p)}G　今日 ${got}/5　持っている ${h}${S.known.i[id] ? '' : '　（' + srcText(ING[INGI[id]]) + '）'}</span></div><div class="btn ${h && got < 5 ? '' : 'dis'}" data-tr="${id}">売る</div></div>`; }).join('');
  modal(C_.trN || '交易所', html + (unl('arms') ? '<div class="btn big blu" data-a="tarms" style="margin-top:4px">⚔ この町の武器屋</div>' : ''), 'trade2');
  bind('[data-a=tarms]', () => openTownArms());
  bind('[data-tr]', d => { const id = d.tr, T2 = expToday(t), got = T2.trade[id] || 0, n = Math.min(5 - got, haveIng(id)); if (n <= 0) return;
    takeIng(id, false, n); const p = Math.round(ING[INGI[id]].value * (lv >= 3 ? 3 : 2.5)) * n; S.gold += p; T2.trade[id] = got + n; sfx('coin'); toast(`${ingName(id)}×${n}を売った +${fmt(p)}G`); expAddXp(t, Math.round(p / 15)); openPortTrade(); });
}
function openPortDiner() {
  const t = curTown(), C_ = TOWNC[t], lv = expLv(t); tut('exp_diner');
  const tier = i => i < 4 ? 1 : i < 8 ? 2 : 3;
  const html = `<div class="p">${C_.dinerTalk}<br>評判が上がると、奥の料理も教えてもらえる。</div>` + C_.ri.map((ri, i) => { const r = REC[ri], kn = S.known.r[ri] || S.learned[ri], need = tier(i), price = r.value * 25;
    return need > lv ? `<div class="row" style="opacity:.45"><div class="calev">🔒</div><div class="t"><b>？？？</b><span>町の評判Lv${need}で教われる</span></div></div>`
      : `<div class="row">${icHTML(r.icon, U * 10, 'atlas')}<div class="t"><b>${r.name}</b><span>${r.ings.map(id => ingName(id)).join('・')}（${r.method}）</span></div>${kn ? '<div class="btn dis">覚えた</div>' : `<div class="btn ${S.gold >= price ? '' : 'dis'}" data-dl="${ri}">${fmt(price)}G</div>`}</div>`; }).join('');
  modal(C_.diner, html, 'diner');
  bind('[data-dl]', d => { const ri = +d.dl, price = REC[ri].value * 25; if (S.gold < price) return; S.gold -= price; S.learned[ri] = true; sfx('ok'); toast(`レシピ『${REC[ri].name}』を覚えた！`); expAddXp(t, 60); openPortDiner(); });
}
function openPortInn() {
  const C_ = TOWNC[curTown()];
  modal(C_.inn, `<div class="p">宿の主人「一晩 300G。朝6時まで眠れるよ」<br>眠っている間も、宵闇亭では従業員が働く。</div><div class="btn big grn" data-a="sleep">泊まる（300G）</div>`, 'inn2');
  bind('[data-a=sleep]', () => { if (S.gold < 300) return toast('お金が足りない'); S.gold -= 300; closeModal(); sleepUntilMorning(); });
}
function expTownMsgs() { return null; }
SCENES.port = {name:'港町シオカゼ', short:'シオカゼ', objs:[
  ...PORT_STALLS.map((s, i) => { const x = [4, 40, 76, 110][i]; return {id:'ps' + i, lb:s.n, r:[x - 2, 108, x + 32, 142], st:[x + 15, 147], act:() => openPortStall(i)}; }),
  {id:'mystall', lb:'自分の屋台を出す', r:[62, 158, 96, 182], st:[79, 188], act:() => openExpStallSell()},
  {id:'diner', lb:'港の食堂', r:[4, 212, 48, 262], st:[26, 267], act:() => openPortDiner()},
  {id:'trade', lb:'交易所', r:[58, 212, 98, 264], st:[78, 267], act:() => openPortTrade()},
  {id:'inn', lb:'宿屋「潮騒」', r:[104, 204, 144, 264], st:[124, 267], act:() => openPortInn()},
  {id:'coach', lb:'馬車（遠征の地図）', r:[96, 276, 142, 318], st:[92, 300], act:() => openExpMap()},
]};
WALKDEF.port = {areas:[[4, 98, 140, 218], [49, 212, 57, 266], [99, 212, 103, 266], [0, 263, 143, 272], [46, 270, 98, 318]],
  blocks:[[3, 116, 35, 143], [39, 116, 71, 143], [75, 116, 107, 143], [109, 116, 141, 143], [10, 158, 50, 183], [110, 150, 140, 169], [68, 163, 90, 177], [0, 92, 22, 108], [124, 90, 144, 110], [95, 96, 120, 112], [111, 191, 125, 209]]};
SCENES.desert = {name:'砂の町サハラン', short:'サハラン', objs:[
  ...DESERT_STALLS.map((s, i) => { const x = [4, 40, 76, 110][i]; return {id:'ds' + i, lb:s.n, r:[x - 2, 76, x + 32, 108], st:[x + 15, 112], act:() => openPortStall(i)}; }),
  {id:'mystall', lb:'自分の屋台を出す', r:[70, 158, 104, 182], st:[87, 187], act:() => openExpStallSell()},
  {id:'diner', lb:'ドームの食堂', r:[4, 196, 48, 262], st:[26, 267], act:() => openPortDiner()},
  {id:'trade', lb:'キャラバン宿（交易所）', r:[56, 210, 98, 262], st:[77, 267], act:() => openPortTrade()},
  {id:'inn', lb:'宿屋「砂の月」', r:[104, 206, 142, 262], st:[123, 267], act:() => openPortInn()},
  {id:'coach', lb:'馬車（遠征の地図）', r:[100, 276, 144, 318], st:[94, 300], act:() => openExpMap()},
]};
WALKDEF.desert = {areas:[[2, 66, 141, 224], [49, 222, 55, 266], [0, 264, 143, 271], [46, 270, 98, 318]],
  blocks:[[3, 92, 35, 107], [39, 92, 71, 107], [75, 92, 107, 107], [109, 92, 141, 107], [83, 117, 141, 148], [5, 119, 22, 131], [45, 125, 58, 136], [59, 123, 74, 135],
    [10, 150, 62, 181], [5, 148, 14, 158], [59, 142, 68, 152], [129, 192, 138, 202], [0, 208, 10, 218], [76, 163, 98, 177], [110, 148, 131, 169], [131, 170, 142, 182],
    [107, 186, 134, 206], [65, 196, 68, 222], [103, 196, 106, 222], [10, 196, 42, 226], [102, 208, 143, 226]]};

// ----- v0.35: 町ごとの仕掛け
function daySeed(t) { let s = gday() * 9973 + t.length * 131 + t.charCodeAt(0) * 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function dishCount(k) { return haveDish(k, false) + haveDish(k, true); }
function takeDishAny(k, n) { let left = n; while (left > 0 && takeDish(k, false, 1)) left--; while (left > 0 && takeDish(k, true, 1)) left--; return n - left; }
function teaOrder() {   // 今日の茶会の注文：知っている料理から2品×2皿
  const rr = daySeed('tea'), known = REC.map((r, i) => i).filter(i => (S.known.r[i] || S.learned[i]) && TOWNC.tea.isLike(REC[i]));
  const pool = known.length >= 2 ? known : TEA_RI.slice(0, 4), out = [];
  while (out.length < 2 && pool.length) { const ri = pool[Math.floor(rr() * pool.length)]; if (!out.includes(ri)) out.push(ri); if (pool.length < 2) break; }
  return out;
}
function openTeaParty() {
  tut('exp_chakai'); const T = expToday('tea'), ord = teaOrder(), lv = expLv('tea');
  const rew = Math.round(ord.reduce((a, ri) => a + dval('r' + ri, false) * 2, 0) * (3 + .25 * (lv - 1)));
  const ok = ord.every(ri => dishCount('r' + ri) >= 2);
  const html = `<div class="p">野点の席の亭主「今日の茶会の客は、この2品を所望しておられる。2皿ずつ用意してくだされば、たっぷりお礼をいたしましょう」<br>茶会は1日1回。ごほうび：<b>${fmt(rew)}G</b>と町の評判+80（料理の値打ちの3倍・評判1Lvごと+0.25倍）。</div>` +
    ord.map(ri => `<div class="row">${icHTML(REC[ri].icon, U * 10, 'atlas')}<div class="t"><b>${REC[ri].name} ×2</b><span>持っている ${dishCount('r' + ri)}皿${S.known.r[ri] || S.learned[ri] ? '' : '（まだ知らないレシピ）'}</span></div></div>`).join('') +
    (T.tea ? '<div class="btn big dis">今日の茶会は終わった（また明日）</div>' : `<div class="btn big ${ok ? 'grn' : 'dis'}" data-a="tea">料理を出す</div>`);
  modal('野点の茶会', html, 'chakai');
  bind('[data-a=tea]', () => { const T2 = expToday('tea'); if (T2.tea || !ord.every(ri => dishCount('r' + ri) >= 2)) return; ord.forEach(ri => takeDishAny('r' + ri, 2));
    T2.tea = 1; if (lv >= 4) legRoll(.08, 'sennen_cha', '茶会の亭主が、お礼に千年茶の新芽を分けてくれた。'); S.gold += rew; S.stat.earned = (S.stat.earned || 0) + rew; S.stat.chakai = (S.stat.chakai || 0) + 1; sfx('coin'); toast(`茶会は大成功！ +${fmt(rew)}G`); expAddXp('tea', 80); openTeaParty(); });
}
function openRoyal() {
  tut('exp_royal'); const T = expToday('capital'), lv = expLv('capital'), items = allDishes().filter(x => x.k[0] === 'r').slice(0, 30);
  const mul = (8 + lv) * (gearAccOn('neck_royal') ? 1.2 : 1);
  const html = `<div class="p">王宮の執事「宵闇亭の料理人どの。王家への献上は1日に1皿。王はよい料理に惜しみなく褒美をくださる」<br>褒美＝料理の値打ち×${mul}（評判Lv1ごとに＋1）。金色の料理は×1.5。町の評判+100。献上した回数 ${S.stat.royal || 0}回。</div>` +
    (T.royal ? '<div class="btn big dis">今日はもう献上した（また明日）</div>' : items.length ? items.map(x => `<div class="row">${dishIcHTML(x.k, U * 10, x.g)}<div class="t"><b>${x.g ? '金色の' : ''}${dishInfo(x.k).name}</b><span>褒美 ${fmt(Math.round(dval(x.k, x.g) * mul * (x.g ? 1.5 : 1)))}G　持っている ${x.n}</span></div><div class="btn grn" data-ry="${x.k}:${x.g ? 1 : 0}">献上</div></div>`).join('') : '<div class="p">料理を持っていない。</div>');
  modal('王宮への献上', html, 'royal');
  bind('[data-ry]', d => { const [k, g] = d.ry.split(':'), gg = g === '1', T2 = expToday('capital'); if (T2.royal || !takeDish(k, gg, 1)) return;
    const p = Math.round(dval(k, gg) * mul * (gg ? 1.5 : 1) * (ULT_KEYS.has(k) ? 3 : 1)); T2.royal = 1; if (lv >= 4) legRoll(.08, 'hyouga_truffle', '王から特別な褒美を賜った。'); S.gold += p; S.stat.earned = (S.stat.earned || 0) + p; S.stat.royal = (S.stat.royal || 0) + 1; sfx('coin');
    popStory(`<div class="tth">🏰 王宮からの褒美</div><div class="ttx">『${dishInfo(k).name}』を献上した。王はたいそうお喜びだ。<br><b>+${fmt(p)}G</b>　町の評判+100</div>`); expAddXp('capital', 100); openRoyal(); });
}
function openGrove() {
  tut('exp_grove'); const T = expToday('isle'), lv = expLv('isle');
  if (T.grove) return modal('島の果樹', '<div class="p">今日はもう摘んだ。明日になるとまた実る。</div>', 'grove');
  modal('島の果樹', `<div class="p">島の人「この木の実は、だれでも1日1回摘んでいいんだよ」<br>評判が上がると、たくさん摘める（いまLv${lv}：${3 + lv}個）。ときどきカカオも見つかる。</div><div class="btn big grn" data-a="pick">実を摘む</div>`, 'grove');
  bind('[data-a=pick]', () => { const T2 = expToday('isle'); if (T2.grove) return; T2.grove = 1; const got = {};
    for (let i = 0; i < 3 + lv; i++) { const id = Math.random() < .12 ? 'cacao' : ISLE_FRUITS[Math.floor(Math.random() * ISLE_FRUITS.length)]; got[id] = (got[id] || 0) + 1; }
    for (const id in got) { add(S.inv, id, got[id]); S.known.i[id] = true; } if (lv >= 4) legRoll(.06, 'taiyou', '果樹のてっぺんに、太陽のように光る実があった。'); sfx('ok'); dirty = true; closeModal();
    popStory(`<div class="tth">🥭 果物を摘んだ（倉庫へ）</div><div class="ttx">${Object.entries(got).map(([id, n]) => ingIc(id, U * 9) + ' ' + ingName(id) + ' ×' + n).join('<br>')}</div>`); expAddXp('isle', 15); });
}
const TOWN_BLD = [{id:'diner', r:[4, 200, 48, 262], st:[26, 267], act:() => openPortDiner()}, {id:'trade', r:[56, 208, 98, 262], st:[77, 267], act:() => openPortTrade()}, {id:'inn', r:[104, 200, 142, 262], st:[123, 267], act:() => openPortInn()}];
function townScene(t, extra, coachLb) {
  const C_ = TOWNC[t];
  return {name:C_.n, short:TOWN_SHORT[t], objs:[
    ...C_.stalls.map((s, i) => { const x = [4, 40, 76, 110][i]; return {id:t + 's' + i, lb:s.n, r:[x - 2, 74, x + 32, 108], st:[x + 15, 112], act:() => openPortStall(i)}; }),
    {id:'mystall', lb:'自分の屋台を出す', r:[70, 158, 104, 182], st:[87, 187], act:() => openExpStallSell()},
    ...TOWN_BLD.map(b => ({...b, lb:{diner:C_.diner, trade:C_.trN || '交易所', inn:C_.inn}[b.id]})), extra,
    {id:'coach', lb:coachLb || '馬車（遠征の地図）', r:[100, 276, 144, 318], st:[94, 300], act:() => openExpMap()}]};
}
const TOWN_AREAS = [[2, 66, 141, 224], [49, 222, 55, 266], [0, 264, 143, 271], [46, 270, 98, 318]];
const STALL_BLK = [[3, 92, 35, 107], [39, 92, 71, 107], [75, 92, 107, 107], [109, 92, 141, 107]];
SCENES.tea = townScene('tea', {id:'chakai', lb:'野点の茶会', r:[104, 140, 138, 172], st:[121, 176], act:() => openTeaParty()});
WALKDEF.tea = {areas:TOWN_AREAS, blocks:[...STALL_BLK, [84, 120, 142, 148], [5, 119, 22, 131], [45, 125, 58, 136], [59, 123, 74, 135], [9, 149, 63, 181], [5, 140, 12, 158], [60, 144, 68, 152],
  [125, 166, 143, 208], [0, 206, 10, 218], [75, 164, 99, 178], [106, 150, 137, 171], [56, 186, 65, 209], [92, 184, 101, 207], [104, 188, 140, 208], [0, 212, 48, 226], [56, 210, 102, 226], [100, 200, 143, 226]]};
SCENES.capital = townScene('capital', {id:'royal', lb:'王宮への献上', r:[104, 138, 138, 172], st:[121, 176], act:() => openRoyal()});
WALKDEF.capital = {areas:TOWN_AREAS, blocks:[...STALL_BLK, [100, 126, 130, 150], [22, 116, 36, 131], [40, 122, 55, 136], [9, 149, 63, 181], [31, 128, 41, 150], [0, 146, 18, 160], [54, 140, 74, 154],
  [124, 194, 143, 208], [0, 210, 14, 222], [76, 163, 100, 177], [106, 140, 136, 172], [58, 186, 64, 209], [94, 184, 100, 207], [18, 180, 52, 208], [0, 206, 48, 226], [56, 208, 102, 226], [100, 190, 143, 226]]};
SCENES.isle = townScene('isle', {id:'grove', lb:'島の果樹', r:[100, 122, 140, 170], st:[121, 176], act:() => openGrove()}, '定期船（遠征の地図）');
WALKDEF.isle = {areas:TOWN_AREAS, blocks:[...STALL_BLK, [86, 114, 142, 146], [18, 120, 58, 132], [24, 136, 42, 148], [9, 149, 63, 181], [4, 150, 14, 158], [58, 144, 68, 152],
  [130, 204, 140, 212], [0, 210, 10, 218], [77, 162, 97, 176], [100, 124, 140, 170], [57, 184, 64, 209], [93, 182, 100, 207], [18, 198, 52, 208], [0, 208, 48, 226], [56, 208, 102, 226], [100, 194, 143, 226]]};

// ===== v0.36: 冒険者ギルド・魔物図鑑・討伐
const GUILD_RN = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
const GUILD_TH = [0, 30, 80, 160, 280, 450, 700, 1000, 1400];
const GUILD_EXF = [0, 4, 9, 15, 22, 30, 40, 55, 75];
const MON_STAR = [10, 100, 1000];
function totalKills(s) { s = s || S; return Object.values(s.kills || {}).reduce((a, b) => a + b, 0); }
function monStar(k, s) { const n = ((s || S).kills || {})[k] || 0; return MON_STAR.filter(t => n >= t).length; }
const monDmgMul = k => 1 + .1 * monStar(k), monDropMul = k => 1 + .25 * monStar(k);
function guildState() { if (!S.guild) S.guild = {gp:0, rank:0, exam:null, q:null, wq:null, done:0}; return S.guild; }
const guildStage = () => [1, 1, 2, 2, 3, 3, 4, 5, 5][guildState().rank];
function monPool() {
  const M = mineState(), L = layerOf(Math.max(1, M.max)), ks = new Set();
  for (let i = 0; i <= L; i++) LAYERS[i].mons.forEach(k => ks.add(k));
  if (unl('abyss') && M.max > 50) DEEP_MONS.forEach(k => ks.add(k));
  return [...ks];
}
function monHome(k) { if (k === 'mslime') return '満月の夜の迷宮・ダンジョン'; const dk = DG_KEYS.find(x => DGD[x].mons.includes(k) || DGD[x].boss === k); if (dk) return `${DGD[dk].n}（${TOWNC[DGD[dk].town].n}）${DGD[dk].boss === k ? 'の最奥' : ''}`; const a = LAYERS.map((L, i) => L.mons.includes(k) ? `B${i * 10 + 1}〜${i * 10 + 10}（${L.n}）` : null).filter(Boolean); if (DEEP_MONS.includes(k)) a.push('奈落の深層'); return a.join('・'); }
function monKilled(m) {
  if (!S.kills) S.kills = {}; const b = monStar(m.k); S.kills[m.k] = (S.kills[m.k] || 0) + (typeof gearAccOn === 'function' && gearAccOn('ring_hunter') ? 2 : 1); dirty = true;
  if (unl('guild')) { tut('mon_dex'); const a = monStar(m.k); if (a > b) { const g = [500, 5000, 50000][a - 1]; S.gold += g; sfx('ok'); popStory(`<div class="tth">📖 魔物図鑑：${MONT[m.k].n} ★${a}</div><div class="ttx">${MON_STAR[a - 1].toLocaleString()}体倒した！ ${MONT[m.k].n}への攻撃+${a * 10}%、落とし物の確率+${a * 25}%。<br>ごほうび +${fmt(g)}G</div>`); } }
  if (m.elite) examPass();
}
function guildFloor(fl) {
  const G = S.guild; if (!G) return;
  for (const q of [...((G.q && G.q.list) || []), G.wq && G.wq.q].filter(Boolean)) if (q.t === 'reach') q.got = Math.max(q.got || 0, fl.f);
  if (G.exam && !G.exam.done && fl.f >= G.exam.f) {
    const pool = fl.v ? DEEP_MONS : LAYERS[layerOf(fl.f)].mons, k = pick(pool), b = MONT[k], sc = (fl.v ? deepSc(fl.f) : 1 + (fl.f - 1) * .025), p = randWalk(fl);
    fl.mons.push({k, elite:true, x:p[0], y:p[1], hp:Math.round(b.hp * sc * 5), max:Math.round(b.hp * sc * 5), atk:Math.round(b.atk * sc * 1.4), spd:b.spd, cd:0, kb:0, wait:rnd(0, 2), path:[]});
    setTimeout(() => toast(`⚔ 昇格試験の<b>試験官の${b.n}</b>がこの階にいる！（赤いオーラ）`, 3500), 500);
  }
}
function drawElite(m) {
  const a = .35 + Math.sin(tNow * 5) * .15; ctx.fillStyle = `rgba(230,60,50,${a})`; ctx.beginPath(); ctx.ellipse(m.x, m.y - 1, 10, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8c050'; ctx.fillRect(m.x - 2, m.y - 24, 5, 1); ctx.fillRect(m.x - 2, m.y - 26, 1, 2); ctx.fillRect(m.x, m.y - 27, 1, 3); ctx.fillRect(m.x + 2, m.y - 26, 1, 2);
}
function examPass() {
  const G = guildState(); if (!G.exam) return; const st0 = guildStage(); G.rank = Math.min(8, G.rank + 1); G.exam = null;
  const g = 1500 * G.rank * G.rank; S.gold += g; sfx('ok'); const st1 = guildStage();
  WEAP.filter(w => w.src === 'exam:' + G.rank).forEach(w => setTimeout(() => addGear(w.id, 2), 900));
  popStory(`<div class="tth">🛡 昇格試験に合格！ ランク${GUILD_RN[G.rank]}</div><div class="ttx">試験官を倒した。受付のリナ「おめでとうございます！ 今日からあなたは<b>${GUILD_RN[G.rank]}ランク</b>の冒険者です」<br>賞金 +${fmt(g)}G${st1 > st0 ? '<br><b>ギルドの建物が大きくなった！</b>' + ({2:'木組みの2階建てになった。', 3:'石造りの建物になり、訓練場ができた。', 4:'両翼に塔が建ち、冒険者の酒場ができた。', 5:'鐘の塔・宝物庫・転移陣ができた。'}[st1] || '') : ''}${G.rank >= 8 ? '<br>最高ランク<b>SSS</b>に到達した！ 伝説の冒険者だ。' : ''}</div>`);
  dirty = true;
}
function gqReward(t, r) { const m = (1 + r) ** 1.6; return {gold:Math.round(({kill:220, item:180, dish:200, reach:260}[t]) * m / 10) * 10, gp:({kill:6, item:5, dish:5, reach:7}[t]) + r}; }
function makeQuest(r, big) {
  const types = ['kill', 'item', 'dish', 'reach'], M = mineState();
  let t = pick(types), q = null;
  if (t === 'dish') { const ks = REC.map((x, i) => i).filter(i => S.known.r[i] || S.learned[i]); if (!ks.length) t = 'kill'; else { const ri = pick(ks); q = {t, ri, n:(2 + Math.floor(r / 2)) * (big ? 4 : 1)}; } }
  if (t === 'item') { const ids = ING.filter(g => S.known.i[g.id] && (['forage', 'pond', 'pier', 'mine'].includes(g.src[0]) || isOre(g.id)) && g.value <= 30 + r * 25).map(g => g.id); if (!ids.length) t = 'kill'; else q = {t, id:pick(ids), n:(3 + r) * (big ? 4 : 1)}; }
  if (t === 'reach') { const top = Math.max(3, M.max); q = {t, f:Math.max(2, Math.min(top + (big ? 8 : 2), 4 + r * 7 + (big ? 10 : 0))), got:0}; }
  if (t === 'kill' || !q) { const k = pick(monPool()); q = {t:'kill', k, n:(3 + r * 2) * (big ? 4 : 1), base:(S.kills || {})[k] || 0}; }
  const rw = gqReward(q.t, r); q.gold = rw.gold * (big ? 6 : 1); q.gp = rw.gp * (big ? 5 : 1); q.big = !!big; return q;
}
function guildQuests() {
  const G = guildState(), d = gday(), w = Math.floor(d / 7);
  if (!G.q || G.q.d !== d) G.q = {d, list:[0, 1, 2].map(() => makeQuest(G.rank))};
  if (!G.wq || G.wq.w !== w) G.wq = {w, q:makeQuest(G.rank, true)};
  return [...G.q.list, G.wq.q];
}
function qProg(q) {
  if (q.t === 'kill') return [Math.min(q.n, ((S.kills || {})[q.k] || 0) - q.base), q.n];
  if (q.t === 'item') return [Math.min(q.n, haveIng(q.id)), q.n];
  if (q.t === 'dish') return [Math.min(q.n, dishCount('r' + q.ri)), q.n];
  return [Math.min(q.f, q.got || 0), q.f];
}
function qText(q) {
  if (q.t === 'kill') return [`討伐：${MONT[q.k].n}を${q.n}体`, `すむ場所：${monHome(q.k)}`];
  if (q.t === 'item') return [`素材集め：${ingName(q.id)}を${q.n}個`, srcText(ING[INGI[q.id]])];
  if (q.t === 'dish') return [`料理の納品：${REC[q.ri].name}を${q.n}皿`, '冒険者たちの食事に'];
  return [`踏破：地下迷宮のB${q.f}まで行く`, '依頼が出てから、その階に着けば達成'];
}
function openGuildBoard() {
  tut('guild'); const qs = guildQuests(), G = guildState();
  const row = (q, i) => { const [a, b] = qProg(q), ok = !q.done && a >= b, [t1, t2] = qText(q);
    return `<div class="row" style="${q.done ? 'opacity:.45' : ''}"><div class="calev">${q.big ? '⭐' : {kill:'⚔', item:'⛏', dish:'🍲', reach:'🕳'}[q.t]}</div><div class="t"><b>${t1}</b><span>${t2}<br>進み具合 ${a}/${b}　ごほうび ${fmt(q.gold)}G・${q.gp}pt</span></div>${q.done ? '<div class="btn dis">済</div>' : `<div class="btn ${ok ? 'grn' : 'dis'}" data-gq="${i}">報告</div>`}</div>`; };
  modal('依頼の掲示板', `<div class="p">ランク${GUILD_RN[G.rank]}向けの依頼。毎日3件が入れ替わる。⭐は週に1件の大きな依頼（7日ごと）。<br>素材と料理は、報告するときに倉庫・カバン・持ち物から納める。</div>
    <div class="h">今日の依頼</div>${qs.slice(0, 3).map(row).join('')}<div class="h">今週の大きな依頼</div>${row(qs[3], 3)}`, 'gboard');
  bind('[data-gq]', d => { const q = guildQuests()[+d.gq], [a, b] = qProg(q); if (q.done || a < b) return;
    if (q.t === 'item') takeIng(q.id, false, q.n); if (q.t === 'dish') takeDishAny('r' + q.ri, q.n);
    q.done = true; G.gp += Math.round(q.gp * (gearAccOn('ring_guild') ? 1.2 : 1) * (1 + ultPerm('gp'))); G.done = (G.done || 0) + 1; S.gold += q.gold; S.stat.earned = (S.stat.earned || 0) + q.gold; sfx('coin'); toast(`依頼を達成！ +${fmt(q.gold)}G・ギルドポイント+${q.gp}`); dirty = true;
    if (G.rank < 8 && G.gp >= GUILD_TH[G.rank + 1] && !G.exam) toast('🛡 昇格試験を受けられる！ 受付へ', 3500);
    openGuildBoard(); });
}
function openGuildDesk() {
  tut('guild'); const G = guildState(), r = G.rank, nx = r < 8 ? GUILD_TH[r + 1] : null;
  const canExam = nx !== null && G.gp >= nx && !G.exam;
  const bar = nx === null ? '<div class="p">最高ランクに到達している。</div>' : `<div class="p">次のランク${GUILD_RN[r + 1]}まで：ギルドポイント ${G.gp}/${nx}</div><div style="height:${U}px;background:#2a1e18;border-radius:3px"><div style="height:100%;width:${Math.min(100, G.gp / nx * 100)}%;background:#c8a040;border-radius:3px"></div></div>`;
  const exam = G.exam ? `<div class="p">⚔ <b>昇格試験の最中</b>：地下迷宮の<b>B${G.exam.f}より深い階</b>に、赤いオーラの試験官が現れる。倒せば合格。</div><div class="btn" data-a="cancel">試験をやめる（また受けられる）</div>`
    : canExam ? `<div class="btn big grn" data-a="exam">昇格試験を受ける（B${GUILD_EXF[r + 1]}より深い階）</div>` : '';
  modal('ギルドの受付', `<div class="p">受付のリナ「冒険者ギルドへようこそ！ 依頼は左の掲示板からどうぞ」</div>
    <div style="font-size:${U * 6}px;text-align:center;color:#e8c050;margin:${U}px 0"><b>ランク ${GUILD_RN[r]}</b></div>${bar}${exam}
    <div class="p">達成した依頼 ${G.done || 0}件　倒した魔物 ${totalKills().toLocaleString()}体　ギルドの建物 ${guildStage()}段階目</div>
    ${unl('arms') ? '<div class="btn big blu" data-a="garms">⚔ ギルドの交換所（武器・指輪）</div>' : ''}${unl('place') ? '<div class="btn big blu" data-a="gplc" style="margin-top:calc(var(--u)*1.4)">🪑 飾りの交換所</div>' : ''}${unl('expd') ? '<div class="btn big" data-a="gsq" style="margin-top:calc(var(--u)*1.4)">🧭 遠征隊</div>' : ''}
    <div class="h">ランクごとの昇格試験</div><div class="p">${GUILD_RN.slice(1).map((n, i) => `${n}：pt${GUILD_TH[i + 1]}・B${GUILD_EXF[i + 1]}〜`).join('　')}</div>`, 'gdesk');
  bind('[data-a=exam]', () => { G.exam = {f:GUILD_EXF[r + 1]}; tut('g_exam'); sfx('ok'); toast(`昇格試験の開始！ 地下迷宮のB${G.exam.f}より深い階で試験官を探そう`, 4000); openGuildDesk(); });
  bind('[data-a=cancel]', () => { G.exam = null; openGuildDesk(); });
  bind('[data-a=garms]', () => openGuildArms()); bind('[data-a=gplc]', () => openPlcShop()); bind('[data-a=gsq]', () => openSquad());
}
function monDexHTML() {
  const ks = Object.keys(MONT), n1 = ks.filter(k => monStar(k) >= 1).length;
  return `<div class="p">倒した魔物 ${totalKills().toLocaleString()}体　★1以上 ${n1}/${ks.length}種。10・100・1,000体で★。★ごとに攻撃+10%・落とし物+25%。</div>` + ks.map(k => { const n = (S.kills || {})[k] || 0, m = MONT[k], st = monStar(k);
    return n ? `<div class="row"><div style="width:${U * 11}px">${m.boss ? bossIcHTML(k, U * 10) : charHTML(k, U * 10)}</div><div class="t"><b>${m.n}　${'★'.repeat(st)}${'☆'.repeat(3 - st)}</b><span>倒した数 ${n.toLocaleString()}　体力${m.hp}・攻撃${m.atk}<br>落とす物：${m.boss ? ingName(DGD[DG_KEYS.find(x => DGD[x].boss === k)].bm) + '・伝説の武器と指輪' : m.drop.map(([id]) => ingName(id)).join('・')}${MPART[k] && unl('monster') ? '・' + ingName(MPART[k][0]) : ''}<br>すむ場所：${monHome(k)}</span></div></div>`
      : `<div class="row" style="opacity:.5"><div style="width:${U * 11}px;filter:brightness(0)">${m.boss ? bossIcHTML(k, U * 10) : charHTML(k, U * 10)}</div><div class="t"><b>？？？</b><span>すむ場所：${monHome(k)}</span></div></div>`; }).join('');
}
const gBlocks = st => [[4, 134, 40, 172], [98, 134, 138, 170], [48, 156, 53, 186], [90, 156, 95, 186], [8, 179, 20, 187], [124, 179, 136, 187],
  ...(st <= 2 ? [[86, 186, 139, 237], [20, 208, 34, 222]] : []), ...(st >= 2 ? [[52, 210, 66, 218], [20, 252, 34, 260]] : []), ...(st >= 3 ? [[84, 186, 141, 233]] : []), ...(st >= 4 ? [[2, 180, 48, 238]] : []),
  ...(st >= 5 ? [[94, 222, 143, 268], [33, 238, 44, 256], [83, 238, 94, 256]] : [])];
SCENES.guild = {name:'冒険者ギルド', short:'ギルド', objs:[
  {id:'gdoor', lb:'冒険者の酒場（中へ）', r:[52, 90, 92, 128], st:[72, 134], act:() => { tavUnl(); go('tavern', 72, 272); }},
  {id:'gdesk', lb:'受付（ランク・昇格試験）', r:[98, 134, 138, 170], st:[117, 176], act:() => openGuildDesk()},
  {id:'gboard', lb:'依頼の掲示板', r:[2, 132, 42, 172], st:[22, 178], act:() => openGuildBoard()},
  {id:'gtrain', lb:'訓練場', r:[84, 186, 140, 232], st:[104, 182], cond:() => guildStage() >= 3, act:() => openWeaponGuide()},
  {id:'gtav', lb:'冒険者の酒場', r:[2, 180, 50, 232], st:[26, 242], cond:() => guildStage() >= 4, act:() => { tavUnl(); go('tavern', 72, 272); }},
  {id:'gvault', lb:'宝物庫', r:[94, 222, 140, 266], st:[90, 262], cond:() => guildStage() >= 5, act:() => openGear()},
  {id:'grune', lb:'転移陣', r:[46, 238, 82, 258], st:[64, 264], cond:() => guildStage() >= 5, act:() => unl('dungeon') ? openDgList('guild') : toast('転移陣：専用ダンジョンが解放されると、ここから直接行ける。')},
  {id:'gexit', lb:'店の外の広場へ', r:[44, 272, 102, 318], st:[72, 300], act:() => go('outside', 110, 266)},
]};
WALKDEF.guild = {areas:[[2, 130, 141, 268], [46, 266, 98, 318]], blocks:gBlocks(1)};
function guildWalkRefresh() { const st = unl('guild') ? guildStage() : 1; if (WALKDEF.guild._st !== st) { WALKDEF.guild.blocks = gBlocks(st); WALKDEF.guild._st = st; buildWalk(); } }

// ===== v0.37: 武器・装備（9種類×3型・レア度・指輪と首飾り・付与）
const WEAP = D.weapons || [], WEAPI = {}; WEAP.forEach(w => WEAPI[w.id] = w);
const ACC = D.acc || [], ACCI = {}; ACC.forEach(a => ACCI[a.id] = a);
const WSUB = {}; (D.subs || []).forEach(s => WSUB[s[0]] = {id:s[0], type:s[1], n:s[2], d:s[4]});
const WFX = D.wfx || {};
const WT_N = {sword:'剣', dagger:'短剣', spear:'槍', hammer:'槌・斧', bow:'弓', staff:'杖', knife:'包丁', scythe:'鎌', whip:'鞭'};
const SUBST = {
  onehand:{r:14, cd:.45, m:1}, great:{r:15, cd:.75, m:1.7, sw:.5, kb:8}, katana:{r:14, cd:.4, m:1, cr:.15},
  knife:{r:12, cd:.28, m:.65, cr:.2}, twin:{r:13, cd:.42, m:.55, hits:2}, throw:{r:42, cd:.45, m:.85, proj:'knife'},
  lance:{r:22, cd:.55, m:1.3}, glaive:{r:20, cd:.6, m:1.15, sw:.6}, halberd:{r:20, cd:.7, m:1.6, kb:8},
  mace:{r:14, cd:.8, m:1.8, kb:10, rock:1}, axe:{r:14, cd:.6, m:1.4, cr:.1}, maul:{r:15, cd:1.0, m:2.4, kb:12, stun:.5, ring:14},
  short:{r:50, cd:.5, m:1.05, proj:'arrow'}, long:{r:72, cd:.8, m:1.5, proj:'arrow'}, xbow:{r:60, cd:1.0, m:2.1, proj:'bolt', two:1},
  wand:{r:40, cd:.55, m:1.1, proj:'magic', bf:.2}, rod:{r:40, cd:.9, m:1.4, proj:'magic', area:16, bf:.3}, tome:{r:46, cd:1.2, m:1.3, proj:'magic', all:46, bf:.5},
  gyuto:{r:12, cd:.4, m:.85, bu:1.5}, deba:{r:13, cd:.55, m:1.1, bu:1.5}, cleaver:{r:13, cd:.7, m:1.4, bu:2},
  sickle:{r:14, cd:.45, m:.8, ring:16}, bigscythe:{r:16, cd:.8, m:1.3, ring:22}, chain:{r:30, cd:.6, m:1.1, slow:1},
  lash:{r:34, cd:.55, m:1.0, stun:.5}, chainwhip:{r:30, cd:.65, m:1.3, stun:.6}, snake:{r:30, cd:.6, m:1.2, two:1},
};
const RAR_N = ['並', '良', '希少', '英雄', '伝説'], RAR_C = ['#d8d0c0', '#7ad86a', '#5aa8ff', '#c87aff', '#ffc850'], RAR_M = [1, 1.1, 1.2, 1.35, 1.5], RAR_SLOT = [1, 1, 2, 2, 3];
const RFX_POOL = ['burn', 'chill', 'poison', 'drain', 'crit', 'swift', 'guard', 'luck', 'gold', 'sweep', 'knock', 'regen', 'butcher', 'might'];
const ENCH = {ruby:'burn', sapphire:'chill', emerald:'poison', amethyst:'drain', diamond:'crit', moonstone:'luck', meitetsu:'might', yasho:'swift', hoshikui:'sweep', naraku:'guard'};
const MAT_ORE = {copper:'copper', iron:'iron', gold:'gold', mithril:'sapphire', star:'diamond', meitetsu:'meitetsu', yasho:'yasho', hoshikui:'hoshikui', naraku:'naraku'};
const MAT_ORDER = ['copper', 'iron', 'gold', 'mithril', 'star', 'meitetsu', 'yasho', 'hoshikui', 'naraku'];
const TOWN_ACC = {port:['ring_fish', 'neck_compass'], desert:['ring_merchant', 'neck_amulet'], tea:['ring_regen', 'neck_omamori'], capital:['ring_def', 'neck_royal'], isle:['ring_luck', 'neck_pearl']};
const GUILD_ACC = [['ring_stam', 1], ['ring_str', 2], ['neck_fang', 2], ['ring_guild', 3], ['ring_hunter', 4], ['ring_wind', 5]];
const DROP_ACC = ['ring_vamp', 'ring_fire', 'ring_ice', 'ring_miner', 'ring_forage'];
function gearSt() { if (!S.gear) S.gear = {list:[], eq:{}, seen:{}, n:0, ench:0}; return S.gear; }
const gearOf = uid => gearSt().list.find(g => g.uid === uid);
const gDef = g => g ? (WEAPI[g.id] || ACCI[g.id]) : null;
const isAcc = g => !!ACCI[g.id];
function addGear(id, r = 0, quiet, nfx) {
  const G = gearSt(); const uid = (G.n = (G.n || 0) + 1) + 100000; const acc = !!ACCI[id];
  const fx = []; if (!acc) { const k = nfx != null ? Math.min(nfx, RFX_POOL.length) : r >= 4 ? 3 : r >= 3 ? 2 : r >= 2 ? 1 + (Math.random() < .5 ? 1 : 0) : r; for (let i = 0; i < k; i++) { const f = pick(RFX_POOL.filter(x => !fx.includes(x))); fx.push(f); } }
  const g = {uid, id, r, fx, en:acc ? [] : Array(RAR_SLOT[r]).fill(null)}; G.list.push(g);
  if (!acc) { const b = FL ? ((FL.eqf || FL.f || 0) / 100) : 0; g.fq = fx.map(() => fxRoll(b)); if (WEAPI[id].fx) g.q0 = fxRoll(b); }
  const first = !G.seen[id]; G.seen[id] = 1; dirty = true;
  if (!quiet) { tut(acc ? 'acc' : 'gear'); toast(`${acc ? '💍' : '⚔'} <b style="color:${RAR_C[r]}">${acc ? '' : RAR_N[r] + '・'}${gDef(g).name}</b>を手に入れた！${first ? '（図鑑に登録）' : ''}`, 3500); }
  if (first) gearMilestone();
  if (!acc && !G.eq.w) G.eq.w = uid;
  return g;
}
function gearMilestone() { const n = Object.keys(gearSt().seen).length, G = gearSt(), k = Math.floor(n / 25); if (k > (G.ms || 0)) { const g = 5000 * k; G.ms = k; S.gold += g; popStory(`<div class="tth">📖 装備図鑑 ${n}種</div><div class="ttx">集めた装備が${k * 25}種に届いた！ ごほうび +${fmt(g)}G</div>`); } }
const eqW = () => { const G = gearSt(); return G.eq.w ? gearOf(G.eq.w) : null; };
function gearFx() {
  const G = gearSt(), out = {}; const ad = (k, q = 1) => { if (!k) return; if (k.startsWith('s_')) { const sr = SER[k.slice(2)]; if (sr) for (const c in sr.fx) out[c] = (out[c] || 0) + sr.fx[c] * q; return; } out[k] = (out[k] || 0) + q; };
  const w = eqW(); if (w) { ad(WEAPI[w.id].fx, w.q0 || 1); if (!w.ua) w.fx.forEach((k, i) => ad(k, (w.fq && w.fq[i]) || 1)); w.en.forEach(k => ad(k)); }
  for (const s of ['r1', 'r2', 'n']) { const g = G.eq[s] && gearOf(G.eq[s]); if (g) ad(ACCI[g.id].fx); }
  if (out.yoiyami && !isNightNow()) delete out.yoiyami;
  if (S.mine) potFx(out);
  return out;
}
const isNightNow = () => { const h = hmNow(); return h >= 18 * 60 || h < 6 * 60; };
function accMul(k) { if (k === 'luck') return accMul0(k) * (typeof potLuck === 'function' ? potLuck() * compLuck() * rsLuck() : 1); if (k === 'shop') return accMul0(k) * (typeof mrShopMul === 'function' ? mrShopMul() * ancMul() * rsShop() : 1); return accMul0(k); }
function accMul0(k) { const f = gearFx(); if (k === 'luck' && S.ult) return (1 + .15 * (f.luck || 0) + .25 * (f.star || 0) + .05 * (f.all || 0)) * (1 + ultPerm('luck')); if (k === 'shop') return 1 + .03 * (f.shop || 0) + .02 * (f.all || 0); if (k === 'luck') return 1 + .15 * (f.luck || 0) + .2 * 0 + .25 * (f.star || 0) + .05 * (f.all || 0); return 1; }
function wStats(g) {
  g = g || eqW(); if (!g) return {r:12, cd:.5, m:1, base:1, sub:null, name:'素手'};
  const d = WEAPI[g.id], st = SUBST[d.sub] || SUBST.onehand;
  return {...st, base:2 + d.tier * 3, rm:RAR_M[g.r] * (g.gm ? 1.1 : 1) * wGrowMul(g), sub:d.sub, name:d.name, tier:d.tier};
}
function wAtkVal(g) { const s = wStats(g); return Math.round(s.base * s.m * (s.rm || 1) * (s.hits || 1)); }
function atkMulFx(f) { return rsAtk() * (buffOn('p_atk') ? 1.25 : 1) * (buffOn('p_atk2') ? 1.5 : 1) * (1 + .1 * dgRingN()) * (1 + .5 * 0) * (S.ult ? 1 + ultPerm('atk') : 1) * (buffOn('ult') ? 1.5 : 1) * (1 + .1 * (f.might || 0) + .15 * (f.hero || 0) + .25 * (f.star || 0) + .4 * (f.yoiyami || 0) + .08 * (f.atk || 0) + .05 * (f.all || 0) + (f.star && ACCI.neck_star ? 0 : 0)); }
function defMulFx() { const f = gearFx(); return compDef() * rsDef() * (buffOn('p_def') ? .75 : 1) * (buffOn('p_def2') ? .55 : 1) * (1 - .1 * dgRingN()) * (buffOn('ult') ? .7 : 1) * (1 - ultPerm('def')) * Math.max(.3, 1 - .08 * (f.guard || 0) - .08 * (f.def || 0) - .1 * (f.hero || 0) - .05 * (f.all || 0) - (gearAccOn('neck_star') ? .1 : 0)); }
const gearAccOn = id => { const G = gearSt(); return ['r1', 'r2', 'n'].some(s => G.eq[s] && gearOf(G.eq[s]) && gearOf(G.eq[s]).id === id); };
function buffDurMul() { const f = gearFx(), s = wStats(); return ultPerm('buff') + 1 + (s.bf || 0) + .3 * (f.magic || 0) + .6 * (f.magic2 || 0) + .5 * (f.martha || 0) + (gearAccOn('neck_omamori') ? .4 : 0); }
let PROJ = [], wSwingT = 0;
function hitMon(t, dmg, st, f, crit, sk, noChain) {
  if (!FL || !FL.mons.includes(t)) return;
  if (t.arm > 0) { t.arm = Math.max(0, t.arm - dmg * (sk ? 2 : .3)); if (t.arm <= 0) { floatAt(t.x, t.y - 28, '鎧が割れた！', 'info'); sfx('break'); } else if (!sk) dmg *= .15; }   // v0.63 鎧：技は2倍で削る（ふつうの攻撃は3割しか削れず、体力には15%）
  else if (MONT[t.k] && MONT[t.k].shield && !sk && !(t.kb > 0)) dmg *= .3;
  dmg = Math.max(1, Math.round(dmg * medalMul('adv'))); t.hp -= dmg;
  if (f.thunder && !noChain) { const o = FL.mons.filter(o => o !== t && Math.hypot(o.x - t.x, o.y - t.y) < 26)[0]; if (o) hitMon(o, dmg * .4 * Math.min(2, f.thunder), st, f, false, sk, true); }
  const kb = (st.kb || 4) + (f.knock ? 6 * Math.min(2, f.knock) : 0), dx = t.x - player.x, dy = t.y - player.y, dd = Math.hypot(dx, dy) || 1;
  if (t.boss) t.hitT = .08; else { t.kb = .15 + (st.stun || 0) + (f.knock ? .2 : 0); const nx = t.x + dx / dd * kb, ny = t.y + dy / dd * kb * .5;   // v0.46: 壁や岩の向こうへ吹き飛ばさない
    if (MONT[t.k].fly ? (nx > 12 && nx < 132 && ny > 40 && ny < 236) : walkable('mine', nx | 0, ny | 0)) { t.x = nx; t.y = ny; } }
  floatAt(t.x, t.y - 18, (crit ? '会心！' : '') + '-' + dmg, crit ? 'info' : 'bad');
  if (f.burn) { t.burn = 3; t.bdps = Math.max(t.bdps || 0, dmg * .25 * Math.min(3, f.burn)); }
  if (f.chill || st.slow) t.slow = 2.5;
  if (f.poison) { t.pois = 4; t.pdps = Math.max(t.pdps || 0, dmg * .15 * Math.min(3, f.poison)); }
  const dr = .05 * (f.drain || 0) + (f.yoiyami ? .05 : 0); if (dr) { const M = mineState(); M.hp = Math.min(M.hpMax, M.hp + dmg * dr); }
  if (t.hp <= 0) killMon(t, null);
}
function doAttack(m) {
  const st = wStats(), f = gearFx(), M = mineState();
  let dmg = st.base * st.m * (st.rm || 1) * (buffOn('atk') ? 1.5 : 1) * forgeMulS() * monDmgMul(m.k) * atkMulFx(f) * wmMul() * deepMul();
  const crCh = .05 + (st.cr || 0) + .1 * (f.crit || 0) + .2 * (f.crit2 || 0) + .25 * (f.moon || 0) + .1 * (f.hero || 0) + .15 * (f.martha || 0) + (gearAccOn('neck_fang') ? .1 : 0);
  const crit = Math.random() < crCh; if (crit) dmg *= f.moon ? 3 : 2;
  wSwingT = .22; sfx('pop'); skGain(7 * (st.hits || 1) * (1 + .1 * (f.swift || 0)));
  if (st.proj) PROJ.push({x:player.x, y:player.y - 9, tx:m.x, ty:m.y - 6, t:0, k:st.proj});
  const others = FL.mons.filter(o => o !== m);
  for (let h = 0; h < (st.hits || 1); h++) hitMon(m, dmg, st, f, crit);
  const extra = [];
  if (st.sw) others.filter(o => Math.hypot(o.x - m.x, o.y - m.y) < 16).forEach(o => extra.push([o, st.sw]));
  if (st.ring) others.filter(o => Math.hypot(o.x - player.x, o.y - player.y) < st.ring).forEach(o => extra.push([o, 1]));
  if (st.area) others.filter(o => Math.hypot(o.x - m.x, o.y - m.y) < st.area).forEach(o => extra.push([o, .6]));
  if (st.all) others.filter(o => Math.hypot(o.x - player.x, o.y - player.y) < st.all).forEach(o => extra.push([o, .7]));
  if (st.two) { const o = others.filter(o => Math.hypot(o.x - m.x, o.y - m.y) < 24).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0]; if (o) extra.push([o, .8]); }
  if (f.sweep || f.reap) others.filter(o => Math.hypot(o.x - m.x, o.y - m.y) < 16).forEach(o => extra.push([o, .5]));
  const done = new Set(); for (const [o, k] of extra) { if (done.has(o)) continue; done.add(o); hitMon(o, dmg * k, st, f, false); }
}
function monTickFx(m, dt) {
  if (m.burn > 0) { m.burn -= dt; m.hp -= m.bdps * dt; }
  if (m.pois > 0) { m.pois -= dt; m.hp -= m.pdps * dt; }
  if (m.slow > 0) m.slow -= dt;
  if ((m.burn > 0 || m.pois > 0) && m.hp <= 0) { killMon(m, null); return true; }
  return false;
}
function gearOnKill(m) {
  const f = gearFx(), d = eqW() ? WEAPI[eqW().id] : null, M = mineState();
  if (f.gold) { const g = Math.round((5 + Math.random() * 10) * ((d && d.tier) || 1)); S.gold += g; floatAt(m.x, m.y - 26, `+${g}G`, 'info'); }
  if (f.reap) M.hp = Math.min(M.hpMax, M.hp + M.hpMax * .03);
  if (!unl('arms') || !FL) return;
  const lm = (1 + .2 * (f.luck || 0)) * accMul('luck');
  if (Math.random() < .012 * lm * curseDrop()) rollGearDrop(FL, m.elite ? 2 : 0);
  if (FL.f >= 100 && Math.random() < .003 * lm * (gearAccOn('neck_star') ? 2 : 1)) rollGearDrop(FL, 4, true);
}
function rollGearDrop(fl, minR = 0, legend) {
  const ff = fl.eqf || fl.f, lay = fl.v || ff > 50 && fl.dg ? 'deep' : String(layerOf(ff)), ln = fl.v || (fl.dg && ff > 50) ? 9 : layerOf(ff);
  if (legend) { const ls = WEAP.filter(w => w.src === 'legend'), acc = ['ring_yoiyami', 'neck_star'], sn = gearSt().seen, un = ls.filter(w => !sn[w.id]); if (Math.random() < .2) return addGear(pick(acc), 4); return addGear(pick(un.length && Math.random() < .75 ? un : ls).id, 4); }   // v0.46: まだ持っていない伝説の武器が出やすい
  if (Math.random() < .15) { const pool = [...DROP_ACC, ...(fl.v ? ['neck_eye'] : [])]; return addGear(pick(pool), 0); }
  const sp = WEAP.filter(w => w.src.startsWith('drop:') && (w.src === 'drop:' + lay || (lay !== 'deep' && +w.src.slice(5) <= ln) || (lay === 'deep')));
  const fo = WEAP.filter(w => w.src === 'forge' && w.tier <= Math.min(9, ln + 2));
  const w = sp.length && Math.random() < .45 ? pick(sp) : pick(fo);
  let r = 0, x = Math.random() * (1 / accMul('luck')) / (1 + .15 * (fl.curse || 0)); r = x < .01 ? 4 : x < .05 ? 3 : x < .17 ? 2 : x < .45 ? 1 : 0; r = Math.max(r, minR);
  { const g = addGear(w.id, r); if (g && unl('appraise') && r >= 2 && !isAcc(g)) { g.ua = 1; toast('🔮 未鑑定の武器だ。酒場の鑑定屋で鑑定しよう', 3000); } return g; }
}
const gearPrice = d => Math.round(300 * Math.pow(d.tier || 3, 2.2) / 10) * 10;
const gearSellP = g => { const d = gDef(g); return isAcc(g) ? 1500 : Math.round(gearPrice(d) * .3 * (1 + g.r * .5)); };
function gearRowHTML(g, act) { const d = gDef(g), acc = isAcc(g), G = gearSt(), on = Object.values(G.eq).includes(g.uid);
  return `<div class="row">${icHTML(acc ? d.icon : gIc(g), U * 10, 'atlas')}<div class="t"><b style="color:${RAR_C[g.r]}">${acc ? '' : RAR_N[g.r] + '・'}${g.ua ? '<span style="color:#c8a0e8">🔮未鑑定・</span>' : ''}${g.gm ? '⚒ガルド銘の' : ''}${acc ? d.name : gNm(g)}${!acc && skOn() ? ` <span style="color:#8ad0c8">Lv${g.lv || 1}${g.aw ? '・覚醒' + (g.alv || 0) : ''}</span>` : ''}${on ? '　<span style="color:#e8c050">装備中</span>' : ''}</b><span>${acc ? d.desc : `${WT_N[d.type]}／${WSUB[d.sub].n}　攻撃${wAtkVal(g)}${[d.fx, ...g.fx].filter(Boolean).length ? '　' + [[d.fx, g.q0], ...g.fx.map((k, i) => [k, g.fq && g.fq[i]])].filter(x => x[0]).map(([k, q]) => (WFX[k] || k).split('：')[0].split('（')[0] + (q != null ? Math.round(q * 100) + '%' : '')).join('・') : ''}${g.en.some(Boolean) ? '　付与：' + g.en.filter(Boolean).map(k => (WFX[k] || k).split('：')[0].split('（')[0]).join('・') : ''}`}</span></div>${act || `<div class="btn" data-gd="${g.uid}">見る</div>`}</div>`; }
let gearTab = 'w';
function openGear() {
  const G = gearSt(); tut('gear');
  const slot = (k, lb) => { const g = G.eq[k] && gearOf(G.eq[k]); return `<div style="flex:1;text-align:center" data-gs="${k}"><div style="font-size:${U * 3.4}px;color:var(--sub)">${lb}</div>${g ? icHTML(isAcc(g) ? gDef(g).icon : gIc(g), U * 11, 'atlas') : `<div style="width:${U * 11}px;height:${U * 11}px;margin:auto;border:1px dashed #6a5a4a;border-radius:4px"></div>`}<div style="font-size:${U * 3.4}px;color:${g ? RAR_C[g.r] : 'var(--sub)'}">${g ? (isAcc(g) ? gDef(g).name : gNm(g)) : 'なし'}</div></div>`; };
  const st = wStats(), f = gearFx();
  const list = G.list.filter(g => gearTab === 'w' ? !isAcc(g) : isAcc(g)).sort((a, b) => (gDef(b).tier || 0) - (gDef(a).tier || 0) || b.r - a.r);
  modal('装備', `<div style="display:flex;gap:2px;margin-bottom:${U}px">${slot('w', '武器')}${slot('r1', '指輪1')}${slot('r2', '指輪2')}${slot('n', '首飾り')}</div>
    <div class="p">攻撃 ${eqW() ? wAtkVal(eqW()) : 1}${forgeMulS() > 1 ? `（鍛え直し×${forgeMulS().toFixed(2)}）` : ''}　射程 ${st.r >= 40 ? '遠い' : st.r >= 20 ? '中くらい' : '近い'}　速さ ${st.cd <= .45 ? '速い' : st.cd <= .7 ? 'ふつう' : '遅い'}${st.sub ? '　' + WSUB[st.sub].d : ''}<br>効果：${Object.keys(f).map(k => (WFX[k] || (ACC.find(a => a.fx === k) || {}).desc || k).split('：')[0]).join('・') || 'なし'}</div>
    <div class="seg"><div class="${gearTab === 'w' ? 'on' : ''}" data-gt="w">武器 ${G.list.filter(g => !isAcc(g)).length}</div><div class="${gearTab === 'a' ? 'on' : ''}" data-gt="a">指輪・首飾り ${G.list.filter(isAcc).length}</div></div>
    ${list.map(g => gearRowHTML(g)).join('') || '<div class="p">まだ持っていない。鍛冶屋ガルドで作る・迷宮で拾う・町やギルドで買える。</div>'}`, 'gear');
  bind('[data-gt]', d => { gearTab = d.gt; openGear(); });
  bind('[data-gd]', d => openGearDetail(+d.gd));
  bind('[data-gs]', d => { const g = G.eq[d.gs] && gearOf(G.eq[d.gs]); if (g) openGearDetail(g.uid); });
}
function openGearDetail(uid) {
  const G = gearSt(), g = gearOf(uid); if (!g) return openGear(); const d = gDef(g), acc = isAcc(g), on = Object.entries(G.eq).find(([k, v]) => v === uid);
  const fxl = acc ? `<div class="p">${d.desc}</div>` : `<div class="p">${WT_N[d.type]}／<b>${WSUB[d.sub].n}</b>：${WSUB[d.sub].d}<br>攻撃 ${wAtkVal(g)}　レア度 <b style="color:${RAR_C[g.r]}">${RAR_N[g.r]}</b>　手に入れ方：${srcJP(d.src)}</div>
    ${d.fx ? `<div class="p">固有の効果：${WFX[d.fx]} ${fxQ(g.q0)}</div>` : ''}${g.fx.length ? `<div class="p">ランダムな効果：${g.fx.map((k, i) => WFX[k] + ' ' + fxQ(g.fq && g.fq[i])).join('／')}</div>` : ''}
    ${(g.q0 != null || g.fq) ? '<div class="p" style="color:var(--sub)">【%】は効果の強さ（60〜140%。深い所で拾うほど上振れ。工房の「数値の振り直し」で振り直せる）</div>' : ''}
    ${skOn() ? `<div class="p">⚔ 技：<b>${SKILLS[d.type].n}</b>（${SKILLS[d.type].d}${g.aw ? '・覚醒で1.5倍' : ''}）${serOf(d) ? `<br>銘の追加効果：${SER[serOf(d)].sk}` : ''}</div><div class="p">武器Lv ${g.lv || 1}${g.aw ? `・覚醒Lv ${g.alv || 0}` : '／20'}（攻撃×${wGrowMul(g).toFixed(2)}）　経験 ${Math.floor(g.xp || 0)}/${wNeed(g)}${!g.aw && (g.lv || 1) >= 20 ? (canAwaken(d) ? '　<b style="color:#ffc850">覚醒できる（工房）</b>' : '　（この武器は覚醒できない：銘・伝説・ボスの武器だけ）') : ''}</div>` : ''}
    <div class="p">付与の枠：${g.en.map(k => k ? WFX[k] : '（空き）').join('／')}</div>`;
  modal(acc ? d.name : gNm(g), `<div style="text-align:center">${icHTML(acc ? d.icon : gIc(g), U * 18, 'atlas')}</div>${fxl}
    ${on ? '<div class="btn big" data-a="off">外す</div>' : acc ? (d.slot === 'ring' ? '<div style="display:flex;gap:3px"><div class="btn big grn" data-a="r1" style="flex:1">指輪1に装備</div><div class="btn big grn" data-a="r2" style="flex:1">指輪2に装備</div></div>' : '<div class="btn big grn" data-a="n">首飾りに装備</div>') : '<div class="btn big grn" data-a="w">装備する</div>'}
    ${on ? '' : `<div class="btn" data-a="sell" style="margin-top:${U}px">売る（${fmt(gearSellP(g))}G）</div>`}<div class="btn" data-a="back" style="margin-top:${U}px">もどる</div>`, 'geard');
  bind('[data-a=back]', () => openGear());
  bind('[data-a=off]', () => { delete G.eq[on[0]]; sfx('tick'); dirty = true; openGear(); });
  for (const k of ['w', 'r1', 'r2', 'n']) bind(`[data-a=${k}]`, () => { for (const s in G.eq) if (G.eq[s] === uid) delete G.eq[s]; G.eq[k] = uid; sfx('ok'); dirty = true; openGear(); });
  bind('[data-a=sell]', () => { const p = gearSellP(g); G.list = G.list.filter(x => x !== g); S.gold += p; sfx('coin'); toast(`${d.name}を売った +${fmt(p)}G`); dirty = true; openGear(); });
}
const srcJP = s => s.startsWith('series') ? '霊峰の修練の塔（階の主・宝箱・魔物）／修練の証の交換／奈落の深層・専用ダンジョンでまれに' : s === 'forge' ? '鍛冶屋で作る' : s === 'legend' ? '伝説（奈落の深層B100より深い所で、ごくまれ）' : s.startsWith('drop') ? (s === 'drop:deep' ? '奈落の深層で拾う' : `迷宮のB${+s.slice(5) * 10 + 1}より深い所で拾う`) : s.startsWith('town') ? `遠征：${TOWNC[s.slice(5)].n}の武器屋` : s.startsWith('guild') ? `ギルドの交換所（ランク${GUILD_RN[+s.slice(6)]}から）` : `昇格試験（ランク${GUILD_RN[+s.slice(5)]}）のごほうび`;
let wfTab = 'sword';
function openWForge() {
  tut('w_forge'); const M = mineState(), types = unl('arms') ? Object.keys(WT_N) : ['sword'];
  if (!types.includes(wfTab)) wfTab = 'sword';
  const subs = Object.values(WSUB).filter(s => s.type === wfTab && (unl('arms') || s.id === 'onehand'));
  let html = `<div class="p">ガルド「鉱石と石炭があれば、どんな武器でも打ってやる」${unl('arms') ? '' : '<br>（ギルドランクEになると、ほかの種類の武器も作れるようになる）'}</div><div class="seg many">${types.map(t => `<div class="${wfTab === t ? 'on' : ''}" data-wt="${t}">${WT_N[t]}</div>`).join('')}</div>`;
  for (const s of subs) {
    html += `<div class="h">${s.n}：${s.d}</div>`;
    html += WEAP.filter(w => w.sub === s.id && w.src === 'forge').map(w => { const ore = MAT_ORE[w.mat], need = w.tier >= 9 ? {naraku:8, coal:12} : {[ore]:2 + w.tier, coal:1 + w.tier}, fee = w.tier >= 9 ? 150000 : Math.round(GEAR[w.tier - 1].price * .6), lock = !M.ever[ore] && w.tier > 1;
      return `<div class="row" style="${lock ? 'opacity:.5' : ''}">${icHTML(w.icon, U * 10, lock ? 'sil' : 'atlas')}<div class="t"><b>${lock ? '🔒 ' : ''}${w.name}${gearSt().seen[w.id] ? '' : ' 🆕'}</b><span>${lock ? `${ingName(ore)}を掘り出すと作れる（${srcHint(ore)}）` : `攻撃${Math.round((2 + w.tier * 3) * SUBST[s.id].m * (SUBST[s.id].hits || 1))}　${needHTML(need)}　${fmt(fee)}G`}</span></div>${lock ? '' : `<div class="btn ${needOk(need) && S.gold >= fee ? '' : 'dis'}" data-wf="${w.id}">作る</div>`}</div>`; }).join('');
  }
  modal('武器を作る', html, 'wforge');
  bind('[data-wt]', d => { wfTab = d.wt; openWForge(); });
  bind('[data-wf]', d => { const w = WEAPI[d.wf], ore = MAT_ORE[w.mat], need = w.tier >= 9 ? {naraku:8, coal:12} : {[ore]:2 + w.tier, coal:1 + w.tier}, fee = w.tier >= 9 ? 150000 : Math.round(GEAR[w.tier - 1].price * .6);
    if (!needOk(need) || S.gold < fee) return; for (const [k, n] of Object.entries(need)) takeIng(k, false, n); S.gold -= fee; sfx('ok'); addGear(w.id, Math.random() < .12 ? 1 : 0); openWForge(); });
}
// ===== v0.56 武器の工房：鍛え上げ・合成・効果の振り直し・分解・ガルドの依頼
let wkTab = 'up';
const wkEq = g => Object.values(gearSt().eq).includes(g.uid);
const wkNext = d => d.src === 'forge' && d.tier < 9 ? WEAP.find(w => w.sub === d.sub && w.src === 'forge' && w.tier === d.tier + 1) : null;
function wkUpCost(nx) { const ore = MAT_ORE[nx.mat]; return nx.tier >= 9 ? {need:{naraku:5, coal:8}, fee:90000, ore} : {need:{[ore]:Math.ceil((2 + nx.tier) * .6), coal:Math.ceil((1 + nx.tier) * .6)}, fee:Math.round(GEAR[nx.tier - 1].price * .35), ore}; }
const wkRrOn = () => { const G = gearSt(); if (!G.rrOn && G.list.some(g => !isAcc(g) && g.fx && g.fx.length)) G.rrOn = 1; return !!G.rrOn; };
const needTxt = need => Object.entries(need).map(([k, n]) => `<span class="chipin ${haveIng(k) >= n ? 'ok' : 'ng'}">${ingName(k)}×${n}（${haveIng(k)}）</span>`).join('');
function grReq() { const G = gearSt(), w = Math.floor(gday() / 7), M = mineState();
  if (!G.gr || G.gr.w !== w) { const tiers = MAT_ORDER.map((m, i) => [MAT_ORE[m], i + 1]).filter(([o]) => M.ever[o]); const [ore, t] = tiers.length ? tiers[tiers.length - 1] : ['copper', 1];
    G.gr = {w, ore, t, n:6 + t * 2, coal:8 + t * 2, fee:3000 * t, done:0}; } return G.gr; }
// ===== v0.57 冒険者の酒場（ギルドの建物の中）：注文・訓練所・鑑定屋・闘技場
function tavUnl() { if (!unl('guild')) return; unlockFeature('tavern'); const r = guildState().rank; if (r >= 1) unlockFeature('train'); if (r >= 2) unlockFeature('appraise'); if (r >= 3) unlockFeature('arena'); }
const TV_WHO = ['剣士のロイ', '弓使いのニナ', '魔術師のカイ', '盗賊のジェド', '僧侶のアン', '槍使いのボルグ', '狩人のミロ', '吟遊詩人のリュート'];
function tvSt() { if (!S.tv) S.tv = {d:-1, o:[], n:0}; return S.tv; }
function tvRefill() {
  const T = tvSt(); if (T.d === gday()) return T; T.d = gday(); T.o = [];
  const kn = Object.keys(S.known.r).map(Number).filter(ri => !SECRET_R.has(ri)); if (!kn.length) return T;
  const kills = Object.values(S.kills || {}).reduce((a, b) => a + b, 0), mon = kn.filter(ri => REC[ri].ings.some(id => ING[INGI[id]] && ['mine', 'dungeon', 'deep'].includes(ING[INGI[id]].src[0])));
  const town = kn.filter(ri => REC[ri].ings.some(id => ING[INGI[id]] && ING[INGI[id]].src[0] === 'town'));
  for (let k = 0; k < 3; k++) { const pool = k === 0 && kills && mon.length ? mon : k === 1 && town.length ? town : kn; let ri = pick(pool), g = 0; while (T.o.some(o => o.ri === ri) && g++ < 10) ri = pick(pool);
    const n = 1 + Math.floor(Math.random() * 3); T.o.push({ri, n, who:pick(TV_WHO), reward:Math.round(REC[ri].value * n * 2.2), gp:2 + n, tag:pool === mon ? '魔物の料理' : pool === town ? '町の料理' : ''}); }
  return T;
}
function openTavern() {
  tavUnl(); tut('m_tavern'); const T = tvRefill();
  let html = `<div class="p">酒場の主人「冒険帰りの連中が腹を空かせてる。注文を届けてくれりゃ、ギルドにも口をきいておくよ」<br>注文は毎朝3件。料理は倉庫・カバン・棚のどこにあってもいい。</div>`;
  html += T.o.length ? T.o.map((o, i) => { const r = REC[o.ri], h = haveDish('r' + o.ri), done = o.done;
    return `<div class="row">${icHTML(r.icon, U * 11, 'atlas', null, 'r:' + o.ri)}<div class="t"><b>${r.name} ×${o.n}${o.tag ? ` <span style="color:#8ad0c8;font-weight:normal">${o.tag}</span>` : ''}</b><span>${o.who}　${fmt(o.reward)}G・ギルド+${o.gp}pt　手持ち ${h}/${o.n}</span></div><div class="btn ${!done && h >= o.n ? 'grn' : 'dis'}" data-tvo="${i}">${done ? '済み' : '出す'}</div></div>`; }).join('')
    : '<div class="p">今日は注文がない（作ったことのある料理が増えると注文が来る）。</div>';
  html += `<div class="p" style="color:var(--sub)">これまでに届けた注文：${T.n || 0}件</div>`;
  if (unl('arena')) html += `<div class="btn big" data-a="arshop" style="margin-top:${U}px">🏅 闘技場メダルの交換所（${(S.ar && S.ar.medal) || 0}枚）</div>`;
  modal('冒険者の酒場', html, 'tavern');
  bind('[data-tvo]', d => { const o = T.o[+d.tvo]; if (!o || o.done || haveDish('r' + o.ri) < o.n) return; takeDish('r' + o.ri, false, o.n); o.done = 1; T.n = (T.n || 0) + 1; S.gold += o.reward; guildState().gp += o.gp; sfx('coin'); dirty = true;
    toast(`🍺 ${o.who}「うまい！ 生き返った」　${fmt(o.reward)}G・ギルド+${o.gp}pt`); openTavern(); });
  bind('[data-a=arshop]', () => openArenaShop());
}
// 訓練所：武器の種類ごとの熟練度
function wmSt() { if (!S.wm) S.wm = {}; return S.wm; }
const wmType = () => { const g = eqW(); return g ? WEAPI[g.id].type : null; };
const wmLv = t => (wmSt()[t] || {lv:0}).lv;
const wmNeed = lv => 25 * (lv + 1);
const wmMul = () => { if (!unl('train')) return 1; const t = wmType(); return t ? 1 + .02 * wmLv(t) : 1; };
function wmXp(n, t) { if (!unl('train')) return; t = t || wmType(); if (!t) return; const W_ = wmSt(), e = W_[t] || (W_[t] = {lv:0, xp:0}); if (e.lv >= 20) return; e.xp += n;
  while (e.lv < 20 && e.xp >= wmNeed(e.lv)) { e.xp -= wmNeed(e.lv); e.lv++; toast(`🗡 ${WT_N[t]}の熟練度が Lv${e.lv} になった！（${WT_N[t]}の攻撃+${e.lv * 2}%）`, 3000); } dirty = true; }
function openTrain() {
  if (!unl('train')) return toast('訓練所：ギルドランクEになると開く。'); tut('m_train'); const W_ = wmSt(), T = S.wmT && S.wmT.d === gday() ? S.wmT : (S.wmT = {d:gday(), n:0}), cur = wmType();
  let html = `<div class="p">教官「武器は使ってこそ手になじむ。倒した魔物の数が、そのまま腕前だ。急ぐなら稽古をつけてやろう（今日あと${3 - T.n}回）」</div>`;
  html += Object.keys(WT_N).map(t => { const e = W_[t] || {lv:0, xp:0}, c = 300 * (e.lv + 1);
    return `<div class="row"><div class="t"><b>${WT_N[t]}　Lv${e.lv}${t === cur ? ' <span style="color:#e8c060;font-weight:normal">装備中</span>' : ''}</b><span>攻撃+${e.lv * 2}%　${e.lv >= 20 ? '極めた' : `次まで ${e.xp}/${wmNeed(e.lv)}`}</span><div class="bar"><i style="width:${e.lv >= 20 ? 100 : Math.round(e.xp / wmNeed(e.lv) * 100)}%"></i></div></div>${e.lv < 20 ? `<div class="btn ${T.n < 3 && S.gold >= c ? '' : 'dis'}" data-tr="${t}" style="font-size:.85em">稽古 +15<br>${fmt(c)}G</div>` : ''}</div>`; }).join('');
  modal('訓練所', html, 'train');
  bind('[data-tr]', d => { const e = W_[d.tr] || {lv:0}, c = 300 * (e.lv + 1); if (T.n >= 3 || S.gold < c) return; S.gold -= c; T.n++; sfx('ok'); wmXp(15, d.tr); openTrain(); });
}
// 鑑定屋
function openAppraise() {
  if (!unl('appraise')) return toast('鑑定屋：ギルドランクDになると開く。'); tut('m_appraise'); const G = gearSt(), ua = G.list.filter(g => g.ua);
  let html = `<div class="p">鑑定士「ふむ、拾い物かね。どれ、この水晶で見てやろう。運がよければ、眠っていた力も目を覚ます」<br>未鑑定の武器は、ランダムな効果がはたらかない。鑑定すると効果が分かり、15%で効果が1つ増える。</div>`;
  html += ua.map(g => { const c = 400 * (g.r + 1) * (g.r + 1); return gearRowHTML(g, `<div class="btn ${S.gold >= c ? 'grn' : 'dis'}" data-ap="${g.uid}" style="font-size:.85em">鑑定<br>${fmt(c)}G</div>`); }).join('') || '<div class="p">未鑑定の武器はない（迷宮で拾う希少以上の武器が未鑑定で出る）。</div>';
  if (ua.length > 1) { const all = ua.reduce((a, g) => a + 400 * (g.r + 1) * (g.r + 1), 0); html += `<div class="btn big ${S.gold >= all ? 'grn' : 'dis'}" data-ap="all">全部鑑定する（${fmt(all)}G）</div>`; }
  modal('鑑定屋', html, 'appraise');
  bind('[data-ap]', d => { const list = d.ap === 'all' ? ua : [gearOf(+d.ap)].filter(Boolean), c = list.reduce((a, g) => a + 400 * (g.r + 1) * (g.r + 1), 0); if (!list.length || S.gold < c) return; S.gold -= c; const lines = [];
    for (const g of list) { g.ua = 0; let plus = ''; if (Math.random() < .15) { const f = pick(RFX_POOL.filter(x => !g.fx.includes(x))); if (f) { g.fx.push(f); plus = ` ＋<b>${(WFX[f] || f).split('：')[0]}</b>が目覚めた！`; } }
      lines.push(`<b style="color:${RAR_C[g.r]}">${gDef(g).name}</b>：${g.fx.map(k => (WFX[k] || k).split('：')[0]).join('・') || '効果なし'}${plus}`); }
    sfx('fanfare'); dirty = true; popStory(`<div class="tth">🔮 鑑定の結果</div><div class="ttx">${lines.join('<br>')}</div>`); openAppraise(); });
}
// 闘技場
function arSt() { const w = Math.floor(gday() / 7); if (!S.ar) S.ar = {medal:0, w, best:0, got:{}, boss:{}, day:-1, runs:0}; if (S.ar.w !== w) { S.ar.w = w; S.ar.best = 0; S.ar.got = {}; } if (S.ar.day !== gday()) { S.ar.day = gday(); S.ar.boss = {}; S.ar.runs = 0; } return S.ar; }
const AR_WK = [[5, 5000, 5], [10, 15000, 10], [20, 40000, 20], [30, 80000, 30]];
function openArena() {
  if (!unl('arena')) return toast('闘技場：ギルドランクCになると開く。'); tut('m_arena'); const A_ = arSt(), D_ = dgSt();
  let html = `<div class="p">闘技場の主「腕に覚えがあるなら来い。倒れても命までは取らん。客は派手な戦いが好きでな」<br>今週の最高記録：<b>${A_.best}</b>波　闘技場メダル：<b>${A_.medal}</b>枚　今日の挑戦 ${A_.runs}/5</div>`;
  html += `<div class="h">勝ち抜き</div>` + [[5, '5連戦'], [10, '10連戦'], [0, '無限（倒れるまで）']].map(([m, n]) => `<div class="btn big ${A_.runs < 5 ? 'grn' : 'dis'}" data-am="${m}" style="margin-bottom:${U}px">${n}</div>`).join('');
  html += `<div class="p" style="color:var(--sub)">今週のごほうび：${AR_WK.map(([n, g, md]) => `${n}波 ${fmt(g)}G＋メダル${md}${A_.got[n] ? '✔' : ''}`).join('　')}</div>`;
  const bs = Object.keys(DGD).filter(k => D_.kb && D_.kb[k] > 0 && DGD[k].boss);
  html += `<div class="h">ボスと再戦（強化版・1日1回ずつ）</div>` + (bs.map(k => `<div class="row"><div class="t"><b>${MONT[DGD[k].boss].n}（${DGD[k].n}）</b><span>体力・攻撃1.5倍　勝つとメダル12＋${ingName(DGD[k].bm)}×2</span></div><div class="btn ${A_.boss[k] ? 'dis' : 'red'}" data-ab="${k}">${A_.boss[k] ? '済み' : '挑む'}</div></div>`).join('') || '<div class="p">まだボスを倒していない（専用ダンジョンのボスを倒すと再戦できる）。</div>');
  html += `<div class="btn big" data-a="arshop" style="margin-top:${U}px">🏅 メダルの交換所</div>`;
  modal('闘技場', html, 'arena');
  bind('[data-am]', d => { if (A_.runs >= 5) return; A_.runs++; arenaStart(+d.am, null); });
  bind('[data-ab]', d => { if (A_.boss[d.ab]) return; A_.boss[d.ab] = 1; arenaStart(1, d.ab); });
  bind('[data-a=arshop]', () => openArenaShop());
}
function arenaWave(w) {
  const M = mineState(), D = Math.max(1, Math.min(60, M.max || 1)), fl = FL;
  if (fl.arena.boss) { const G = DGD[fl.arena.boss], b = mkMon(G.boss, 72, 120, 1, 0); b.boss = 1; b.hp = b.max = Math.round(b.max * 1.5); b.atk = Math.round(b.atk * 1.5); fl.mons.push(b); fl.boss = true; return; }
  const L = LAYERS[layerOf(D)], n = Math.min(7, 2 + Math.floor(w / 2)), sc = (1 + (D - 1) * .025) * (1 + .07 * (w - 1));
  for (let i = 0; i < n; i++) { const p = randWalk(fl), m = mkMon(pick(L.mons), p[0], p[1], sc, 0); if (w % 5 === 0 && i === 0) { m.elite = 1; m.hp = m.max = m.max * 2; } fl.mons.push(m); }
}
function arenaStart(mode, boss) {
  closeModal(); const M = mineState(); M.hp = M.hpMax; M.st = M.stMax; M.trip = {};
  FL = {f:1, arena:{mode, wave:1, boss, ret:true}, eqf:Math.max(1, M.max || 1), rocks:[], mons:[], ladder:null, broken:0, special:null, elevator:false, lake:null, chest:null, lava:false, blk:[],
    walkFn:(x, y) => ((x - 72) / 62) ** 2 + ((y - 142) / 98) ** 2 < 1};
  buildMineWalk(); arenaWave(1); buildMineWalk(); go('mine', 72, 230);
  setTimeout(() => toast(boss ? `👑 ${MONT[DGD[boss].boss].n}（強化版）との再戦！` : `🏟 第1波！${mode ? `（${mode}連戦）` : '（無限）'}`, 2500), 500);
}
function arenaTick(dt) {
  const a = FL.arena; if (FL.mons.length) return;
  a.t = (a.t || 0) + dt; if (a.t < 1.6) return; a.t = 0;
  if (a.boss || (a.mode && a.wave >= a.mode)) return arenaEnd(true);
  a.wave++; FL.f = a.wave; const M = mineState(); M.hp = Math.min(M.hpMax, M.hp + M.hpMax * .15); M.st = Math.min(M.stMax, M.st + M.stMax * .2);
  arenaWave(a.wave); buildMineWalk(); toast(`🏟 第${a.wave}波！${a.wave % 5 === 0 ? '（強敵あり）' : ''}`, 1800);
}
function arenaEnd(won) {
  const a = FL.arena, A_ = arSt(), M = mineState(), cleared = a.boss ? (won ? 1 : 0) : (won ? a.wave : a.wave - 1);
  let md = 0, gold = 0; const lines = [];
  if (a.boss) { if (won) { md = 12; const G = DGD[a.boss]; add(S.inv, G.bm, 2); S.known.i[G.bm] = true; lines.push(`${ingName(G.bm)}×2`); } }
  else { md = cleared + (a.mode === 5 && won ? 5 : 0) + (a.mode === 10 && won ? 15 : 0); gold = Math.round(300 * cleared * (1 + (M.max || 1) / 20));
    if (cleared > A_.best) A_.best = cleared; for (const [n, g, m2] of AR_WK) if (A_.best >= n && !A_.got[n]) { A_.got[n] = 1; gold += g; md += m2; lines.push(`今週${n}波のごほうび ${fmt(g)}G・メダル${m2}`); } }
  A_.medal += md; S.gold += gold; S.stat.arena = Math.max(S.stat.arena || 0, cleared);
  FL = null; M.hp = M.hpMax; M.st = M.stMax; M.trip = {}; player.mining = player.target = null; go('tavern', 30, 232);
  setTimeout(() => popStory(`<div class="tth">🏟 ${won ? '勝利！' : '闘技場から退場'}</div><div class="ttx">${a.boss ? (won ? `${MONT[DGD[a.boss].boss].n}（強化版）を倒した！` : 'ボスに敗れた……') : `${cleared}波を勝ち抜いた。`}<br>闘技場メダル +${md}${gold ? `　${fmt(gold)}G` : ''}${lines.length ? '<br>' + lines.join('<br>') : ''}<br>今週の最高記録：${A_.best}波</div>`), 500);
  dirty = true;
}
const AR_SHOP_BASE = [['scroll', 3, 3, '帰還の巻物×3'], ['p_elixir', 1, 8, 'エリクサー'], ['p_heal2', 3, 4, '上級回復薬×3'], ['gem', 2, 6, '宝石の袋（ランダム×2）'], ['wbook', 1, 6, '訓練の書（装備中の種類の熟練度+60）'], ['hero', 1, 40, '英雄の武器（ランダム・今いちばん良い素材）']];
function openArenaShop() {
  const AR_SHOP = AR_SHOP_BASE.concat(Object.entries(PLC_RARE_C).map(([k, c]) => ['plc:' + k, 1, c, '飾り：' + PLCI[k].n + '（持っている ' + ((plcSt().own || {})[k] || 0) + '）']));
  const A_ = arSt();
  modal('闘技場メダルの交換所', `<div class="p">メダル：<b>${A_.medal}</b>枚</div>` + AR_SHOP.map(([id, n, c, lb], i) => `<div class="row"><div class="t"><b>${lb}</b><span>メダル${c}枚</span></div><div class="btn ${A_.medal >= c ? 'grn' : 'dis'}" data-as="${i}">交換</div></div>`).join(''), 'arshop');
  bind('[data-as]', d => { const [id, n, c, lb] = AR_SHOP[+d.as]; if (A_.medal < c) return; A_.medal -= c;
    if (id === 'gem') { for (let k = 0; k < n; k++) add(S.inv, pick(Object.keys(ENCH).slice(0, 6)), 1); }
    else if (id === 'wbook') { if (!wmType()) { A_.medal += c; return toast('武器を装備していない'); } wmXp(60); }
    else if (id.startsWith('plc:')) { const P = plcSt(), k = id.slice(4); if ((P.own[k] || 0) >= PLC_COPY) { A_.medal += c; return toast('同じ飾りは3つまで'); } P.own[k] = (P.own[k] || 0) + 1; }
    else if (id === 'hero') { const M = mineState(), tiers = MAT_ORDER.map((m, k) => [MAT_ORE[m], k + 1]).filter(([o]) => M.ever[o]), t = tiers.length ? tiers[tiers.length - 1][1] : 1, w = pick(WEAP.filter(x => x.src === 'forge' && x.tier === t)); addGear(w.id, 3); }
    else { add(S.inv, id, n); S.known.i[id] = true; }
    sfx('coin'); dirty = true; toast(`🏅 ${lb}と交換した`); openArenaShop(); });
}
SCENES.tavern = {name:'冒険者の酒場', short:'酒場', objs:[
  {id:'tvbar', lb:'カウンター（冒険者の注文）', r:[44, 30, 100, 58], st:[72, 68], act:() => openTavern()},
  {id:'tvappr', lb:() => unl('appraise') ? '鑑定屋' : '鑑定屋（ギルドランクDで開く）', r:[108, 104, 143, 150], st:[102, 146], act:() => openAppraise()},
  {id:'tvarena', lb:() => unl('arena') ? '闘技場' : '闘技場（ギルドランクCで開く）', r:[0, 158, 42, 222], st:[50, 216], act:() => openArena()},
  {id:'tvtrain', lb:() => unl('train') ? '訓練所' : '訓練所（ギルドランクEで開く）', r:[96, 158, 143, 222], st:[88, 216], act:() => openTrain()},
  {id:'tvexit', lb:'ギルド前の広場へ', r:[56, 268, 88, 288], st:[72, 278], act:() => go('guild', 72, 136)},
]};
SCENES.tavern.objs.forEach(o => { if (typeof o.lb === 'function') { const f = o.lb; Object.defineProperty(o, 'lb', {get:f}); } });
WALKDEF.tavern = {areas:[[4, 62, 140, 266], [56, 264, 88, 288]], blocks:[[0, 72, 24, 114], [36, 82, 68, 104], [80, 80, 112, 102], [56, 116, 88, 138], [106, 102, 144, 152], [0, 156, 44, 224], [94, 156, 144, 224], [48, 234, 96, 262]]};
function drawTavern() {
  const out = [];
  if (IMG.tv_boards) { if (!unl('arena')) out.push({y:0, f:() => ctx.drawImage(IMG.tv_boards, 5, 182)}); if (!unl('train')) out.push({y:0, f:() => ctx.drawImage(IMG.tv_boards, 108, 182)}); }
  const npc = [['lizard', 72, 42, false], ['knight', 44, 86, false], ['hood', 102, 84, true], ['traveler', 66, 120, false], ['noble', 82, 120, true]];
  if (unl('appraise')) npc.push(['witch', 128, 116, true]); if (unl('arena')) npc.push(['knight', 52, 196, false]); if (unl('train')) npc.push(['beard', 92, 198, true]);
  for (const [k, x, y, fl] of npc) out.push({y, f:() => drawChar(k, x, y, fl)});
  return out;
}
// ===== v0.59 丘の農地（裏の農場の奥）：土地3区画・特別な畑4つ・動物4種
const HILL_LAND = [{n:'1区', cost:8000, d:'畑8区画・果樹4本・動物の囲い'}, {n:'2区', cost:20000, d:'畑8区画・果樹4本・棚田と茶畑の場所'}, {n:'3区', cost:45000, d:'畑8区画・果樹4本・ぶどう棚と原木の場所'}];
const HSPF = {
  paddy:{n:'棚田', i:'🌾', z:2, cost:5000, r:[4, 182, 66, 242], st:[72, 212], crops:[['rice', 20, 600], ['mochigome', 12, 600]], d:'水を張った段々の田。米やもち米が一度にたくさん採れる'},
  tea:{n:'茶畑', i:'🍵', z:2, cost:4000, r:[78, 182, 140, 242], st:[72, 212], crops:[['tea', 12, 600]], d:'茶葉が採れる。石臼で抹茶にできる'},
  vine:{n:'ぶどう棚', i:'🍇', z:3, cost:6000, r:[4, 36, 66, 94], st:[72, 66], crops:[['grape', 10, 900]], d:'ぶどうが果樹より早く、たくさん採れる'},
  logs:{n:'きのこの原木', i:'🍄', z:3, cost:3000, r:[78, 36, 140, 94], st:[72, 66], crops:[['shiitake', 10, 600], ['maitake', 8, 720], ['shimeji', 12, 600], ['enoki', 12, 600]], d:'しいたけ・まいたけ・しめじ・えのきから選んで育てる'},
};
const HANI = {
  sheep:{n:'羊', shed:'羊小屋', cost:3000, out:'sheep_milk', per:300, r:[4, 404, 66, 452], st:[70, 428], area:[28, 424, 60, 446], d:'羊乳が採れる（乳製品台でクリームチーズやチーズに）'},
  goat:{n:'ヤギ', shed:'ヤギ小屋', cost:2500, out:'goat_milk', per:240, r:[78, 404, 140, 452], st:[74, 428], area:[84, 426, 112, 446], d:'ヤギ乳が採れる（乳製品台でヨーグルトやチーズに）'},
  pig:{n:'豚', shed:'豚小屋', cost:4000, out:'truffle', per:600, r:[4, 456, 66, 502], st:[70, 480], area:[28, 470, 60, 496], d:'土を掘って、トリュフやきのこを見つけてくる'},
  duck:{n:'アヒル', shed:'アヒル小屋', cost:1500, out:'egg', per:300, r:[78, 456, 140, 502], st:[74, 480], area:[84, 472, 116, 496], d:'卵を産む'},
};
const hillSt = () => { if (!S.hill) S.hill = {lv:0, sp:{}, an:{}}; if (!S.hill.sp) S.hill.sp = {}; if (!S.hill.an) S.hill.an = {}; return S.hill; };
const hspOn = k => hillLv() >= HSPF[k].z && !!hillSt().sp[k];
const haniN = k => { const a = hillSt().an[k]; return a && hillLv() >= 1 ? a.lv * 2 : 0; };
function hillUnl() { if (!unl('hill') && unl('ranch') && rankIdx() >= 2) unlockFeature('hill'); }
function hillStep(dt, vis) {
  const H = hillSt(); if (!H.lv) return; const rain = wxOn('rain') || wxOn('storm');
  for (const k in HSPF) { const sp = H.sp[k]; if (!sp || !hspOn(k)) continue; const c = HSPF[k].crops.find(x => x[0] === sp.id) || HSPF[k].crops[0];
    if ((sp.n || 0) >= 2) continue; sp.t = (sp.t || 0) + dt * (rain ? (k === 'logs' ? 1.3 : 1.2) : 1) * mrHelp('farm') * plcMul('farm');
    while (sp.t >= c[2] && (sp.n || 0) < 2) { sp.t -= c[2]; sp.n = (sp.n || 0) + 1; } if ((sp.n || 0) >= 2) sp.t = 0; }
  if (S.staff.farmer) for (const k in HSPF) { const sp = H.sp[k]; if (sp && hspOn(k) && sp.n >= 2) hspHarvest(k, false, vis); }
  for (const k in HANI) { const cnt = haniN(k); if (!cnt) continue; const A = H.an[k], a = HANI[k];
    A.t = (A.t === undefined ? a.per : A.t) - dt * cnt;
    let guard = 0; while (A.t <= 0 && guard++ < 50) { A.t += a.per; let id = a.out;
      if (k === 'pig') id = Math.random() < .25 * luckMul() ? 'truffle' : pick(['shiitake', 'maitake', 'shimeji']);
      const g = Math.random() < .03 * luckMul(); withQ(1.5, () => add(g ? S.invG : S.inv, id, 1)); S.known.i[id] = true; rep_.ranch = (rep_.ranch || 0) + 1;
      if (k === 'pig' && id === 'truffle') S.stat.truffle = (S.stat.truffle || 0) + 1;
      if (vis && scene === 'hill') floatAt(a.st[0], a.st[1] - 14, (g ? '金色の' : '') + ingName(id) + ' +1', 'info'); } }
}
function hspHarvest(k, toBag, vis) { const sp = hillSt().sp[k]; if (!sp || !sp.n) return 0; const c = HSPF[k].crops.find(x => x[0] === sp.id) || HSPF[k].crops[0], n = c[1] * sp.n;
  const gn = Math.random() < .05 * luckMul() ? 1 : 0;
  withQ(1.8, () => { if (toBag) giveBag('i', c[0], false, n - gn); else add(S.inv, c[0], n - gn); if (gn) add(S.invG, c[0], gn); }); S.known.i[c[0]] = true;
  sp.n = 0; rep_.harvested = (rep_.harvested || 0) + n; S.stat.hspN = (S.stat.hspN || 0) + n; dirty = true;
  if ((vis || toBag) && scene === 'hill') floatAt(HSPF[k].st[0], HSPF[k].r[1] + 4, `${ingName(c[0])} +${n}`, 'info'); return n; }
function openHillLand() {
  tut('m_hill'); const H = hillSt();
  const rows = HILL_LAND.map((L, z) => { const own = H.lv > z, next = H.lv === z;
    return `<div class="row"><div class="t"><b>${own ? '✅' : next ? '🪧' : '🔒'} ${L.n}</b><span>${L.d}</span></div>${own ? '<div class="btn dis">購入済み</div>' : next ? `<div class="btn ${S.gold >= L.cost ? 'grn' : 'dis'}" data-hl="${z}">${fmt(L.cost)}G</div>` : `<div class="btn dis">${fmt(L.cost)}G</div>`}</div>`; }).join('');
  modal('丘の農地　土地の売買', `<div class="p">下の区画から順に買える。買うとすぐ畑と果樹の場所が使える（畑の扱いは裏の農場と同じ。農夫も手伝う）。</div>` + rows + (H.lv ? `<div class="btn big" data-a="tr">🌳 丘の果樹をまとめて見る</div>` : ''), 'hillland');
  bind('[data-hl]', d => { const z = +d.hl, L = HILL_LAND[z]; if (H.lv !== z || S.gold < L.cost) return; S.gold -= L.cost; H.lv = z + 1; sfx('ok'); dirty = true; closeModal();
    toast(`丘の農地の<b>${L.n}</b>を買った！ ${z === 0 ? '畑8区画・果樹4本・動物の囲いが使える。' : z === 1 ? '畑8区画・果樹4本が増え、棚田と茶畑が建てられる。' : '畑8区画・果樹4本が増え、ぶどう棚と原木が建てられる。'}`, 4000); if (z === 0) tut('m_hillsp'); });
  bind('[data-a=tr]', () => openOrchard(true));
}
function openSpecial(k) {
  const f = HSPF[k], H = hillSt();
  if (hillLv() < f.z) return toast(`🔒 ${f.n}：丘の農地の${HILL_LAND[f.z - 1].n}を買うと建てられる。`);
  tut('m_hillsp'); const sp = H.sp[k];
  if (!sp) { modal(f.n, `<div class="result"><div class="p">${f.d}。</div><div class="p">育つ物：${f.crops.map(c => `${ingName(c[0])}（${secT(c[2])}で${c[1]}個）`).join('・')}</div><div class="p">種はいらない。育つと自動で次を育て始める（収穫を2回分までためておける）。農夫がいると、たまったら収穫する。</div></div><div class="btn big ${S.gold >= f.cost ? 'grn' : 'dis'}" data-a="b">${f.n}を建てる　${fmt(f.cost)}G</div>`, 'hillsp');
    bind('[data-a=b]', () => { if (S.gold < f.cost || H.sp[k]) return; S.gold -= f.cost; H.sp[k] = {id:f.crops[0][0], t:0, n:0}; sfx('ok'); dirty = true; toast(`${f.n}を建てた！`); openSpecial(k); }); return; }
  const c = f.crops.find(x => x[0] === sp.id) || f.crops[0], left = (sp.n || 0) >= 2 ? 0 : c[2] - (sp.t || 0);
  let html = `<div class="result"><div class="p">${f.d}。</div><div class="p">いま育てている物：<b>${ingName(c[0])}</b>（${secT(c[2])}で${c[1]}個）<br>${sp.n ? `<b>収穫${sp.n}回分</b>がたまっている（${c[1] * sp.n}個）` : '育成中'}${(sp.n || 0) < 2 ? `　次まであと${secT(Math.ceil(left))}` : '　（いっぱい。収穫すると次が育つ）'}</div></div>`;
  html += `<div class="btn big ${sp.n ? 'grn' : 'dis'}" data-a="h">収穫する</div>`;
  if (f.crops.length > 1) html += `<div class="p" style="margin-top:${U * 2}px">育てる物を変える（育成中の分は最初から）</div>` + f.crops.map(x => `<div class="row">${ingIc(x[0], U * 10, false, true)}<div class="t"><b>${ingName(x[0])}</b><span>${secT(x[2])}で${x[1]}個</span></div>${x[0] === sp.id ? '<div class="btn dis">育成中</div>' : `<div class="btn" data-cr="${x[0]}">変える</div>`}</div>`).join('');
  modal(f.n, html, 'hillsp');
  bind('[data-a=h]', () => { const n = hspHarvest(k, true); if (n) { sfx('pop'); syncBag(); } openSpecial(k); });
  bind('[data-cr]', d => { if (sp.n) hspHarvest(k, true); sp.id = d.cr; sp.t = 0; sfx('pop'); dirty = true; toast(`${f.n}で${ingName(d.cr)}を育て始めた。`); openSpecial(k); });
}
function openPen(k) {
  const a = HANI[k], H = hillSt();
  if (hillLv() < 1) return toast(`🔒 ${a.shed}：丘の農地の1区を買うと建てられる。`);
  tut('m_hillsp'); const A = H.an[k];
  if (!A) { modal(a.shed, `<div class="result"><div style="display:flex;justify-content:center;gap:${U * 2}px">${charHTML(k, U * 14)}${charHTML(k, U * 14)}</div><div class="p">${a.n}：${a.d}。</div><div class="p">小屋を建てると${a.n}が2頭来る（増築で4頭）。丘の草を食べるので、えさはいらない。</div></div><div class="btn big ${S.gold >= a.cost ? 'grn' : 'dis'}" data-a="b">${a.shed}を建てる　${fmt(a.cost)}G</div>`, 'hillpen');
    bind('[data-a=b]', () => { if (S.gold < a.cost || H.an[k]) return; S.gold -= a.cost; H.an[k] = {lv:1, t:a.per}; sfx('ok'); dirty = true; toast(`${a.shed}を建てた！ ${a.n}が2頭やってきた。`); closeModal(); if (scene === 'hill') buildActors(); }); return; }
  const up = Math.round(a.cost * 1.5), n = A.lv * 2, each = Math.round(a.per / 60);
  modal(a.shed, `<div class="result"><div style="display:flex;justify-content:center;gap:${U}px;flex-wrap:wrap">${Array(n).fill(charHTML(k, U * 12)).join('')}</div><div class="p">${a.n} ${n}頭：${a.d}。<br>1頭あたり約${each}分に1つ。品物は食材の箱に直接入る。</div></div>` +
    (A.lv < 2 ? `<div class="btn big ${S.gold >= up ? 'grn' : 'dis'}" data-a="up">増築して4頭にする　${fmt(up)}G</div>` : '<div class="p">いっぱいまで増築した。</div>'), 'hillpen');
  bind('[data-a=up]', () => { if (S.gold < up || A.lv >= 2) return; S.gold -= up; A.lv = 2; sfx('ok'); dirty = true; toast(`${a.shed}を増築した！ ${a.n}が4頭になった。`); closeModal(); if (scene === 'hill') buildActors(); });
}
SCENES.hill = {name:'丘の農地', short:'丘の農地', objs:[
  {id:'hexit', lb:'裏の農場に戻る', r:[56, 508, 88, 528], st:[72, 512], act:() => go('farm', 72, 372)},
  {id:'hland', lb:'土地の売買（立て札）', r:[90, 506, 114, 524], st:[84, 514], act:() => openHillLand()},
  ...PLOTS.slice(24).map((p, k) => ({id:'hplot' + k, r:[p.x - 1, p.y - 1, p.x + p.w + 1, p.y + p.h + 1], st:[p.x + 6, p.y + 16], act:() => tapPlot(24 + k), plot:24 + k})),
  ...TREEPOS.slice(4).map(([x, y], k) => ({id:'htree' + k, lb:'果樹', r:[x - 8, y - 16, x + 8, y + 4], st:[x, y + 8], act:() => tapTree(4 + k), tree:4 + k})),
  ...Object.entries(HSPF).map(([k, f]) => ({id:'hsp_' + k, get lb() { return hillLv() < f.z ? `🔒 ${f.n}（${HILL_LAND[f.z - 1].n}を買うと建てられる）` : hillSt().sp[k] ? f.n + (hillSt().sp[k].n ? `（収穫${hillSt().sp[k].n}回分）` : '') : `${f.n}を建てる（${fmt(f.cost)}G）`; }, r:f.r, st:f.st, act:() => openSpecial(k)})),
  ...Object.entries(HANI).map(([k, a]) => ({id:'han_' + k, get lb() { return hillLv() < 1 ? `🔒 ${a.shed}` : hillSt().an[k] ? `${a.shed}（${a.n}${haniN(k)}頭）` : `${a.shed}を建てる（${fmt(a.cost)}G）`; }, r:a.r, st:a.st, act:() => openPen(k)})),
]};
WALKDEF.hill = {areas:[[2, 32, 142, 526]], blocks:[[2, 34, 66, 92], [78, 34, 142, 92], [2, 180, 66, 240], [78, 180, 142, 240], [2, 400, 67, 506], [77, 400, 142, 506], [0, 504, 56, 528], [88, 504, 144, 528],
  ...HILL_TP.flat().map(([x, y]) => [x - 7, y - 4, x + 7, y + 4])]};
SCENES.farm.objs.push({id:'hillway', lb:'丘の農地へ', r:[60, 370, 84, 396], st:[72, 374], cond:() => unl('hill'), act:() => { tut('m_hill'); go('hill', 72, 512); }});
function drawHill() {
  const out = [], lv = hillLv(), H = hillSt();
  if (lv < 3 && IMG.hill_ov3) ctx.drawImage(IMG.hill_ov3, 0, 30);
  if (lv < 2 && IMG.hill_ov2) ctx.drawImage(IMG.hill_ov2, 0, 176);
  for (let k = 0; k < 24; k++) { const i = 24 + k, p = PLOTS[i], z = Math.floor(k / 8); if (z >= lv) { if (z === 0) lockArea(p.x - 1, p.y - 1, p.x + p.w + 1, p.y + p.h + 1, false, k % 4 === 0); continue; } drawPlotCrop(i); }
  for (let k = 0; k < 12; k++) { const i = 4 + k, z = Math.floor(k / 4); if (z >= lv) continue; const t = S.trees[i], [x, y] = TREEPOS[i]; if (!t) continue; const st = t.g >= 1200 ? 2 : t.g >= 400 ? 1 : 0;
    out.push({y:y + 4, f:() => { drawChar('tree' + st, x, y + 4); for (let q = 0; q < (t.fruit || 0); q++) drawIcon(ING[INGI[t.id]].icon, x - 6 + q * 4, y - 12 + (q % 2) * 3, 6); }}); }
  if (lv < 1) { for (const [x, y] of HILL_TP[0]) lockArea(x - 9, y - 4, x + 9, y + 6, false, false); }
  for (const k in HSPF) { const f = HSPF[k], r = f.r; if (lv < f.z) continue; const sp = H.sp[k];
    if (!sp) { lockArea(r[0], r[1], r[2], r[3], true); continue; }
    const c = f.crops.find(x => x[0] === sp.id) || f.crops[0];
    if (sp.n) { const cx = (r[0] + r[2]) / 2 - 5; drawIcon(ING[INGI[c[0]]].icon, cx, r[1] + 2 + Math.sin(tNow * 3) * .8, 10); if (sp.n >= 2 && Math.sin(tNow * 4) > .5) { ctx.fillStyle = '#fffbd0'; ctx.fillRect(cx + 11, r[1] + 2, 1, 1); ctx.fillRect(cx + 10, r[1] + 3, 3, 1); ctx.fillRect(cx + 11, r[1] + 4, 1, 1); } }
    const pr = sp.n >= 2 ? 1 : (sp.t || 0) / c[2]; ctx.fillStyle = '#140c08'; ctx.fillRect(r[0] + 2, r[3] - 3, r[2] - r[0] - 4, 2); ctx.fillStyle = sp.n ? '#e8c860' : '#8aa05a'; ctx.fillRect(r[0] + 2, r[3] - 3, Math.round((r[2] - r[0] - 4) * Math.min(1, pr)), 1); }
  for (const k in HANI) { const r = HANI[k].r; if (lv < 1 || !H.an[k]) lockArea(r[0] + 1, r[1] + 1, r[2] - 1, r[3] - 3, true, lv >= 1); }
  return out;
}
function openWorks() {
  tut('m_works'); const G = gearSt(), ws = G.list.filter(g => !isAcc(g)), rr = wkRrOn();
  const tabs = [['up', '鍛え上げ'], ['fuse', '合成'], ...(rr ? [['rr', '振り直し']] : []), ...(skOn() ? [['aw', '覚醒'], ['rv', '数値の振り直し']] : []), ['dis', '分解'], ['req', 'ガルドの依頼']]; if (!tabs.some(t => t[0] === wkTab)) wkTab = 'up';
  let html = `<div class="seg many">${tabs.map(([k, n]) => `<div class="${wkTab === k ? 'on' : ''}" data-wk="${k}">${n}</div>`).join('')}</div>`;
  if (wkTab === 'up') { html += `<div class="p">ガルド「打った武器は、次の鉱石で鍛え上げられる。効果も付与もそのままだ」（鍛冶屋で作れる武器だけ。作り直すより安い）</div>`;
    html += ws.map(g => { const d = gDef(g), nx = wkNext(d); if (!nx) return ''; const c = wkUpCost(nx), lock = !mineState().ever[c.ore], ok = !lock && needOk(c.need) && S.gold >= c.fee;
      return gearRowHTML(g, `<div class="btn ${ok ? 'grn' : 'dis'}" data-up2="${g.uid}" style="font-size:.85em">${lock ? '🔒' : '鍛え上げ'}<br>${fmt(c.fee)}G</div>`) + `<div class="p" style="margin:-${U}px 0 ${U}px ${U * 12}px">${lock ? `${ingName(c.ore)}を掘り出すと鍛え上げられる` : `→ <b>${nx.name}</b>（攻撃 ${wAtkVal(g)}→${wAtkVal({...g, id:nx.id})}）　${needTxt(c.need)}`}</div>`; }).join('') || '<div class="p">鍛え上げられる武器がない（鍛冶屋で作った武器が対象）。</div>'; }
  if (wkTab === 'fuse') { html += `<div class="p">ガルド「同じ武器が2本あれば、1本にまとめてレア度を上げてやる。効果と付与の枠も増えるぞ」（伝説まで。2本目は無くなる）</div>`;
    const by = {}; ws.forEach(g => (by[g.id] = by[g.id] || []).push(g));
    html += Object.values(by).filter(a => a.length >= 2).map(a => { a.sort((x, y) => y.r - x.r || (wkEq(y) ? 1 : 0) - (wkEq(x) ? 1 : 0)); const g = a[0], b = a.slice(1).find(x => !wkEq(x)); if (!b || g.r >= 4) return ''; const fee = 2000 * (g.r + 1) * (g.r + 1);
      return gearRowHTML(g, `<div class="btn ${S.gold >= fee ? 'grn' : 'dis'}" data-fu="${g.uid}:${b.uid}" style="font-size:.85em">${RAR_N[g.r]}→${RAR_N[g.r + 1]}<br>${fmt(fee)}G</div>`); }).join('') || '<div class="p">同じ武器を2本持っていない（伝説は合成できない）。</div>'; }
  if (wkTab === 'rr') { html += `<div class="p">ガルド「気に入らない効果があれば、1つ打ち直してやる。何が出るかは槌しだいだ」（ランダムな効果を1つ選んで引き直す。お金と、その武器の鉱石か石炭）</div>`;
    html += ws.filter(g => g.fx && g.fx.length).map(g => { const d = gDef(g), ore = d.src === 'forge' ? MAT_ORE[d.mat] : 'coal', n = d.src === 'forge' ? 2 : 4, fee = 3000 * (g.r + 1);
      return gearRowHTML(g, '') + `<div style="display:flex;flex-wrap:wrap;gap:${U * .6}px;margin:-${U * .6}px 0 ${U * 1.4}px ${U * 12}px">${g.fx.map((k, i) => `<div class="btn ${haveIng(ore) >= n && S.gold >= fee ? '' : 'dis'}" data-rr="${g.uid}:${i}" style="font-size:.8em">🎲 ${(WFX[k] || k).split('：')[0].split('（')[0]}</div>`).join('')}<span style="font-size:.85em;color:var(--sub)">${fmt(fee)}G＋${ingName(ore)}×${n}</span></div>`; }).join('') || '<div class="p">ランダムな効果のついた武器がない。</div>'; }
  if (wkTab === 'dis') { html += `<div class="p">ガルド「使わない武器は溶かして鉱石に戻せる。付与した宝石も外して返す」（装備中の武器は分解できない）</div>`;
    html += ws.filter(g => !wkEq(g)).map(g => { const out = wkDis(g); return gearRowHTML(g, `<div class="btn" data-ds="${g.uid}" style="font-size:.85em">分解</div>`) + `<div class="p" style="margin:-${U}px 0 ${U}px ${U * 12}px">→ ${Object.entries(out).map(([k, n]) => ingName(k) + '×' + n).join('・')}</div>`; }).join('') || '<div class="p">分解できる武器がない。</div>'; }
  if (wkTab === 'req') { const q = grReq(), need = {[q.ore]:q.n, coal:q.coal}, ok = !q.done && needOk(need) && S.gold >= q.fee;
    html += `<div class="p">ガルド「週に一度、いい鉱石を持ってきてくれたら、わしが本気で打つ。<b>ガルド銘</b>の武器はここでしか手に入らんぞ」</div>
      <div class="row"><div class="t"><b>今週の依頼${q.done ? '（済み・来週また）' : ''}</b><span>${needTxt(need)}　${fmt(q.fee)}G</span><span>ごほうび：好きな種類の<b>ガルド銘の武器</b>（${MAT_ORDER[q.t - 1] ? WEAP.find(w => w.src === 'forge' && w.tier === q.t).name.replace(/^(.+?)の.*/, '$1') : ''}・英雄・効果3つ・攻撃+10%）</span></div></div>`;
    if (!q.done) html += `<div class="p">打ってほしい種類：</div><div style="display:flex;flex-wrap:wrap;gap:${U * .6}px">${Object.values(WSUB).filter(x => unl('arms') || x.id === 'onehand').map(x => `<div class="btn ${ok ? 'grn' : 'dis'}" data-gq="${x.id}" style="font-size:.85em">${x.n}</div>`).join('')}</div>`; }
  if (wkTab === 'aw') { const T = twSt(), need = {naraku:5}, fee = 50000, mk = 10;
    html += `<div class="p">ガルド「Lv20まで使い込んだ銘・伝説・ボスの武器は、<b>覚醒</b>させられる。攻撃×1.2、技は1.5倍、付与の枠も1つ増える。そのあとも使うほど少しずつ強くなるぞ」<br>（奈落晶×5・修練の証×${mk}・${fmt(fee)}G。修練の証 いま${T.mk}）</div>`;
    html += ws.filter(g => canAwaken(gDef(g)) && !g.aw).map(g => { const ok = (g.lv || 1) >= 20 && needOk(need) && T.mk >= mk && S.gold >= fee; return gearRowHTML(g, `<div class="btn ${ok ? 'grn' : 'dis'}" data-aw="${g.uid}" style="font-size:.85em">${(g.lv || 1) >= 20 ? '覚醒' : 'Lv' + (g.lv || 1) + '/20'}</div>`); }).join('') || '<div class="p">覚醒できる武器（銘・伝説・ボスの武器）を持っていない。</div>'; }
  if (wkTab === 'rv') { html += `<div class="p">ガルド「効果の<b>強さ</b>だけを打ち直す。効果の種類は変わらん」（1つにつき 石炭×3・2,000G×(レア度+1)）</div>`;
    html += ws.filter(g => g.q0 != null || (g.fq && g.fq.length)).map(g => { const d = gDef(g), fee = 2000 * (g.r + 1), ok = haveIng('coal') >= 3 && S.gold >= fee, items = [...(g.q0 != null ? [['0', d.fx, g.q0]] : []), ...g.fx.map((k, i) => [String(i + 1), k, g.fq && g.fq[i]])];
      return gearRowHTML(g, '') + `<div style="display:flex;flex-wrap:wrap;gap:${U * .6}px;margin:-${U * .6}px 0 ${U * 1.4}px ${U * 12}px">${items.map(([i, k, q]) => `<div class="btn ${ok ? '' : 'dis'}" data-rv="${g.uid}:${i}" style="font-size:.8em">🎲 ${(WFX[k] || k).split('：')[0].split('（')[0]} ${Math.round((q || 1) * 100)}%</div>`).join('')}<span style="font-size:.85em;color:var(--sub)">${fmt(fee)}G＋石炭×3</span></div>`; }).join('') || '<div class="p">数値のある効果がついた武器がない。</div>'; }
  modal('武器の工房', html, 'works');
  bind('[data-aw]', d => { const g = gearOf(+d.aw), T = twSt(), need = {naraku:5}, fee = 50000; if (!g || g.aw || (g.lv || 1) < 20 || !needOk(need) || T.mk < 10 || S.gold < fee) return;
    takeIng('naraku', false, 5); T.mk -= 10; S.gold -= fee; g.aw = 1; g.alv = 0; g.xp = 0; g.en.push(null); sfx('fanfare'); dirty = true; S.stat.awaken = (S.stat.awaken || 0) + 1;
    popStory(`<div class="tth">✨ 覚醒！</div><div style="text-align:center">${icHTML(gIc(g), U * 22, 'atlas')}</div><div class="ttx"><b>${gNm(g)}</b>になった！<br>攻撃×1.2・技が1.5倍・付与の枠+1。これからも使うほど少しずつ強くなる。</div>`, () => openWorks()); });
  bind('[data-rv]', d => { const [u, i] = d.rv.split(':'), g = gearOf(+u), fee = 2000 * (g.r + 1); if (!g || haveIng('coal') < 3 || S.gold < fee) return; takeIng('coal', false, 3); S.gold -= fee;
    const b = .3, nq = fxRoll(b); if (i === '0') g.q0 = nq; else { if (!g.fq) g.fq = g.fx.map(() => 1); g.fq[+i - 1] = nq; } sfx('ok'); dirty = true; toast(`🎲 強さ → <b>${Math.round(nq * 100)}%</b>`, 2500); openWorks(); });
  bind('[data-wk]', d => { wkTab = d.wk; openWorks(); });
  bind('[data-up2]', d => { const g = gearOf(+d.up2), nx = wkNext(gDef(g)); if (!nx) return; const c = wkUpCost(nx); if (!mineState().ever[c.ore] || !needOk(c.need) || S.gold < c.fee) return;
    for (const [k, n] of Object.entries(c.need)) takeIng(k, false, n); S.gold -= c.fee; g.id = nx.id; G.seen[nx.id] = 1; sfx('ok'); dirty = true; toast(`⚒ ${nx.name}に鍛え上げた！`); openWorks(); });
  bind('[data-fu]', d => { const [a, b] = d.fu.split(':').map(Number), g = gearOf(a), h = gearOf(b); if (!g || !h || g.r >= 4 || wkEq(h)) return; const fee = 2000 * (g.r + 1) * (g.r + 1); if (S.gold < fee) return;
    S.gold -= fee; g.r++; const want = g.r >= 4 ? 3 : g.r >= 3 ? 2 : 1; while (g.fx.length < want) { const f = pick(RFX_POOL.filter(x => !g.fx.includes(x))); if (!f) break; g.fx.push(f); if (g.fq) g.fq.push(fxRoll()); }
    while (g.en.length < RAR_SLOT[g.r]) g.en.push(null); h.en.forEach(k => { if (k) { const gem = Object.keys(ENCH).find(x => ENCH[x] === k); if (gem) add(S.inv, gem, 2); } });
    G.list = G.list.filter(x => x !== h); sfx('ok'); dirty = true; toast(`✨ ${RAR_N[g.r]}の${gDef(g).name}になった！`); openWorks(); });
  bind('[data-rr]', d => { const [u, i] = d.rr.split(':').map(Number), g = gearOf(u), dd = gDef(g), ore = dd.src === 'forge' ? MAT_ORE[dd.mat] : 'coal', n = dd.src === 'forge' ? 2 : 4, fee = 3000 * (g.r + 1); if (haveIng(ore) < n || S.gold < fee) return;
    takeIng(ore, false, n); S.gold -= fee; const old = g.fx[i], f = pick(RFX_POOL.filter(x => !g.fx.includes(x))); if (f) { g.fx[i] = f; if (g.fq) g.fq[i] = fxRoll(); } sfx('ok'); dirty = true; toast(`🎲 ${(WFX[old] || old).split('：')[0]} → <b>${(WFX[g.fx[i]] || g.fx[i]).split('：')[0]}</b>`, 3000); openWorks(); });
  bind('[data-ds]', d => { const g = gearOf(+d.ds); if (!g || wkEq(g)) return; const out = wkDis(g); for (const k in out) { add(S.inv, k, out[k]); S.known.i[k] = true; } G.list = G.list.filter(x => x !== g); sfx('break'); dirty = true; toast('分解した：' + Object.entries(out).map(([k, n]) => ingName(k) + '×' + n).join('・')); openWorks(); });
  bind('[data-gq]', d => { const q = grReq(), need = {[q.ore]:q.n, coal:q.coal}; if (q.done || !needOk(need) || S.gold < q.fee) return; const w = WEAP.find(x => x.sub === d.gq && x.src === 'forge' && x.tier === q.t); if (!w) return;
    for (const [k, n] of Object.entries(need)) takeIng(k, false, n); S.gold -= q.fee; q.done = 1; addGear(w.id, 3, false, 3); const g = G.list[G.list.length - 1]; g.gm = 1; sfx('fanfare'); dirty = true; openWorks(); });
}
function wkDis(g) { const d = gDef(g), out = {}; if (d.src === 'forge') { out[MAT_ORE[d.mat]] = Math.max(1, Math.ceil((2 + d.tier) / 2)); out.coal = Math.ceil((1 + d.tier) / 2); } else { const t = Math.max(1, Math.min(9, d.tier || 3)); out[MAT_ORE[MAT_ORDER[t - 1]]] = 2 + g.r; out.coal = 2; }
  g.en.forEach(k => { if (k) { const gem = Object.keys(ENCH).find(x => ENCH[x] === k); if (gem) out[gem] = (out[gem] || 0) + 2; } }); return out; }
function openEnchant() {
  tut('enchant'); const G = gearSt(), ws = G.list.filter(g => !isAcc(g));
  modal('付与（効果をつける）', `<div class="p">ガルド「武器の空き枠に宝石を埋め込めば、効果がつく。あとで付け替えもできるぞ」<br>${Object.entries(ENCH).map(([k, v]) => `${ingName(k)}＝${(WFX[v] || v).split('：')[0].split('（')[0]}`).join('・')}<br>宝石2個と、1,500G×武器の強さ。枠の数はレア度で決まる（並・良1、希少・英雄2、伝説3）。</div>` +
    (ws.map(g => gearRowHTML(g, `<div class="btn" data-en="${g.uid}">付与</div>`)).join('') || '<div class="p">武器を持っていない。</div>'), 'ench');
  bind('[data-en]', d => openEnchantOne(+d.en));
}
function openEnchantOne(uid) {
  const g = gearOf(uid), d = gDef(g), fee = 1500 * d.tier;
  const rows = g.en.map((k, i) => `<div class="h">枠${i + 1}：${k ? WFX[k] : '空き'}</div>` + Object.entries(ENCH).map(([ore, fx]) => `<div class="row">${ingIc(ore, U * 9)}<div class="t"><b>${ingName(ore)} → ${(WFX[fx] || fx)}</b><span>${ingName(ore)}×2（持っている ${haveIng(ore)}）　${fmt(fee)}G</span></div><div class="btn ${haveIng(ore) >= 2 && S.gold >= fee && k !== fx ? '' : 'dis'}" data-es="${i}:${ore}">つける</div></div>`).join('')).join('');
  modal('付与：' + d.name, rows + '<div class="btn" data-a="back">もどる</div>', 'ench1');
  bind('[data-a=back]', () => openEnchant());
  bind('[data-es]', x => { const [i, ore] = x.es.split(':'); if (haveIng(ore) < 2 || S.gold < fee) return; takeIng(ore, false, 2); S.gold -= fee; g.en[+i] = ENCH[ore]; gearSt().ench = (gearSt().ench || 0) + 1; sfx('ok'); toast(`${d.name}に「${(WFX[ENCH[ore]] || '').split('：')[0]}」をつけた`); dirty = true; openEnchantOne(uid); });
}
function openShopArms(title, items, accs, note) {
  const html = `<div class="p">${note}</div>` + items.map(w => { const p = gearPrice(w), lock = w._lock;
    return `<div class="row" style="${lock ? 'opacity:.5' : ''}">${icHTML(w.icon, U * 10, lock ? 'sil' : 'atlas')}<div class="t"><b>${w.name}${gearSt().seen[w.id] ? '' : ' 🆕'}</b><span>${lock ? lock : `${WT_N[w.type]}／${WSUB[w.sub].n}　攻撃${Math.round((2 + w.tier * 3) * SUBST[w.sub].m * (SUBST[w.sub].hits || 1) * 1.1)}${w.fx ? '　' + (WFX[w.fx] || '').split('（')[0] : ''}`}</span></div>${lock ? '' : `<div class="btn ${S.gold >= p ? '' : 'dis'}" data-bw="${w.id}">${fmt(p)}G</div>`}</div>`; }).join('') +
    accs.map(([a, lock]) => `<div class="row" style="${lock ? 'opacity:.5' : ''}">${icHTML(ACCI[a].icon, U * 10, lock ? 'sil' : 'atlas')}<div class="t"><b>${ACCI[a].name}</b><span>${lock || ACCI[a].desc}</span></div>${lock ? '' : `<div class="btn ${S.gold >= 12000 ? '' : 'dis'}" data-ba="${a}">12,000G</div>`}</div>`).join('');
  modal(title, html, 'sarms');
  bind('[data-bw]', d => { const w = WEAPI[d.bw], p = gearPrice(w); if (S.gold < p) return; S.gold -= p; sfx('coin'); addGear(w.id, 1); openShopArms(title, items, accs, note); });
  bind('[data-ba]', d => { if (S.gold < 12000) return; S.gold -= 12000; sfx('coin'); addGear(d.ba, 0); openShopArms(title, items, accs, note); });
}
function openTownArms() {
  if (!unl('arms')) return gateMsg('arms'); const t = curTown();
  openShopArms(TOWN_SHORT[t] + 'の武器屋', WEAP.filter(w => w.src === 'town:' + t), (TOWN_ACC[t] || []).map(a => [a, null]), `${TOWNC[t].n}ならではの武器と装飾品。町で買う武器はレア度「良」。`);
}
function openGuildArms() {
  if (!unl('arms')) return gateMsg('arms'); const r = guildState().rank;
  openShopArms('ギルドの交換所', WEAP.filter(w => w.src.startsWith('guild:')).map(w => ({...w, _lock:+w.src.slice(6) > r ? `ランク${GUILD_RN[+w.src.slice(6)]}から` : null})), GUILD_ACC.map(([a, k]) => [a, k > r ? `ランク${GUILD_RN[k]}から` : null]), 'ランクが上がるほど、交換所に並ぶ物が増える。');
}
function openWeaponGuide() {
  modal('訓練場', `<div class="p">教官「武器には9つの種類と、それぞれ3つの型がある。型ごとに戦い方が違うぞ」</div>` + Object.keys(WT_N).map(t => `<div class="h">${WT_N[t]}</div>` + Object.values(WSUB).filter(s => s.type === t).map(s => `<div class="p"><b>${s.n}</b>：${s.d}</div>`).join('')).join(''), 'wguide');
}
function gearDexHTML() {
  const G = gearSt(), all = [...WEAP, ...ACC], n = all.filter(x => G.seen[x.id]).length;
  return `<div class="p">集めた装備 ${n}/${all.length}種。25種ごとにごほうび。</div><div class="grid">${all.map(x => `<div class="cell">${icHTML(x.icon, U * 11, G.seen[x.id] ? 'atlas' : 'sil')}</div>`).join('')}</div>`;
}
function migrateSwords() {
  if (!S.toolInv) return; const sw = S.toolInv.filter(t => TOOLI[t.id] && TOOLI[t.id].kind === 'sword'); if (!sw.length) return;
  let best = null;
  for (const t of sw) { const tier = TOOLI[t.id].tier, g = addGear('onehand_' + MAT_ORDER[tier - 1], 0, true); if (!best || tier > best[0]) best = [tier, g.uid]; }
  const ids = new Set(sw.map(t => t.uid)); S.toolInv = S.toolInv.filter(t => !ids.has(t.uid)); S.bag = S.bag.map(x => x && x.k === 't' && ids.has(x.uid) ? null : x);
  gearSt().eq.w = best[1];
}
function drawWeaponSwing() {
  if (scene !== 'mine' || wSwingT <= 0) return; const g = eqW(); if (!g) return; const d = WEAPI[g.id], st = SUBST[d.sub] || {};
  if (st.proj && st.proj !== 'knife') { drawIcon(d.icon, player.x + (player.flip ? -12 : 2), player.y - 16, 10, 'world'); return; }
  const k = 1 - wSwingT / .22, ang = (player.flip ? -1 : 1) * (-1.2 + k * 2.2);
  ctx.save(); ctx.translate(player.x + (player.flip ? -3 : 3), player.y - 9); ctx.rotate(ang); if (player.flip) ctx.scale(-1, 1);
  const im = IMG.world, sz = st.r >= 18 ? 14 : 11; ctx.drawImage(im, (d.icon % COLS) * 32, Math.floor(d.icon / COLS) * 32, 32, 32, -2, -sz + 2, sz, sz); ctx.restore();
}
function drawProj() {
  const out = [];
  for (const p of PROJ) out.push({y:300, f:() => { const x = p.x + (p.tx - p.x) * p.t, y = p.y + (p.ty - p.y) * p.t;
    if (p.k === 'magic') { ctx.fillStyle = 'rgba(160,220,255,.35)'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#e8f8ff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
    else { const a = Math.atan2(p.ty - p.y, p.tx - p.x), L = p.k === 'bolt' ? 6 : p.k === 'knife' ? 4 : 7; ctx.strokeStyle = p.k === 'knife' ? '#e8ecf4' : '#c8a868'; ctx.lineWidth = p.k === 'bolt' ? 2 : 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * L, y - Math.sin(a) * L); ctx.stroke(); ctx.fillStyle = '#e8ecf4'; ctx.fillRect(x - .5, y - .5, 1.5, 1.5); } }});
  return out;
}

// ===== v0.38: 伝説の食材・究極のレシピ・交易キャラバン
const LEG = {naraku_kinoko:'mine', tenro:'tower', kinrin:'nushi', gekka:'forage', sennen_ninjin:'farm', niji_tamago:'ranch', meifu_zakuro:'night', kaiou:'port', senya_dates:'desert', sennen_cha:'tea', hyouga_truffle:'capital', taiyou:'isle'};
const LEG_HINT = {mine:'奈落の深層の魔物・宝箱', tower:'決闘の塔の20階より上で勝つ', nushi:'ヌシを釣り上げる', forage:'月光の森で採集', farm:'畑の収穫', ranch:'鶏小屋の卵', night:'裏営業の深夜の客', port:'港町シオカゼ（キャラバンの到着・屋台・評判Lv4〜）', desert:'砂の町サハラン（キャラバンの到着・屋台・評判Lv4〜）', tea:'茶の里ミドリ（キャラバンの到着・野点の茶会）', capital:'雪の王都シルヴァ（キャラバンの到着・王宮への献上）', isle:'南の果実島ルルア（キャラバンの到着・島の果樹）'};
const TOWN_LEG = {port:'kaiou', desert:'senya_dates', tea:'sennen_cha', capital:'hyouga_truffle', isle:'taiyou'};
const ULT_RI = (D.recipes || []).map((r, i) => r.ings.some(id => LEG[id]) ? i : -1).filter(i => i >= 0);
ULT_KEYS = new Set(ULT_RI.map(i => 'r' + i));
const ULT_PERM = [['hp', 20, '迷宮の最大体力+20'], ['st', 20, '迷宮の気力の最大+20'], ['shop', .02, '料理の値打ち+2%'], ['buff', .2, '料理のバフ時間+20%'], ['atk', .05, '攻撃+5%'], ['luck', .1, '落とし物+10%'],
  ['def', .05, '受けるダメージ-5%'], ['rep', .1, '遠征の町の評判+10%'], ['gp', .1, 'ギルドポイント+10%'], ['shop', .02, '料理の値打ち+2%'], ['atk', .05, '攻撃+5%'], ['shop', .03, '料理の値打ち+3%']];
function ultSt() { if (!S.ult) S.ult = {made:{}, perm:{}}; return S.ult; }
const ultPerm = k => (ultSt().perm[k] || 0);
function giveLegend(id, why) {
  if (!LEG[id] || !unl('caravan')) return false;
  add(S.inv, id, 1); const first = !S.known.i[id]; S.known.i[id] = true; dirty = true;
  const ri = ULT_RI.find(i => REC[i].ings.includes(id)); let learn = '';
  if (ri != null && !S.learned[ri]) { S.learned[ri] = true; learn = `<br>伝説の料理帖のページがひらいた：<b>『${REC[ri].name}』</b>（${REC[ri].ings.map(ingName).join('・')}／${REC[ri].method}）`; }
  sfx('ok'); tut('legend');
  popStory(`<div class="tth">✨ 伝説の食材：${ingName(id)}</div><div class="ttx">${why || ''}${first ? '初めて手に入れた！' : ''}${learn}</div>`);
  return true;
}
const legRoll = (p, id, why) => unl('caravan') && Math.random() < p * (S.gear ? accMul('luck') : 1) && giveLegend(id, why);
function ultCooked(key) {
  if (!ULT_KEYS.has(key)) return; const U_ = ultSt(); if (U_.made[key]) return; U_.made[key] = 1;
  const i = ULT_RI.indexOf(+key.slice(1)), pm = ULT_PERM[i % ULT_PERM.length]; U_.perm[pm[0]] = (U_.perm[pm[0]] || 0) + pm[1];
  if (pm[0] === 'hp') { const M = mineState(); M.hpMax += pm[1]; } if (pm[0] === 'st') { const M = mineState(); M.stMax += pm[1]; }
  tut('ult'); const n = Object.keys(U_.made).length;
  popStory(`<div class="tth">👑 究極の料理：${REC[+key.slice(1)].name}</div><div class="ttx">初めて作った！ 永久に<b>${pm[2]}</b>。（究極の料理 ${n}/${ULT_RI.length}）${n >= ULT_RI.length ? '<br><b>12品すべてを作った。あなたは「究極の料理人」だ！</b> +1,000,000G' : ''}</div>`);
  if (n >= ULT_RI.length && !U_.all) { U_.all = 1; S.gold += 1000000; }
  dirty = true;
}
// ---- caravan
const CARA_POS = {port:[104, 122], desert:[28, 140], tea:[34, 62], capital:[98, 30], isle:[126, 162]};
const CARA_CAP = [10, 16, 24, 34, 48], CARA_SPD = [1, .88, .76, .66, .56], CARA_GRD = [0, .2, .38, .52, .65], CARA_BUY = [30000, 80000, 200000, 450000, 900000];
function caraSt() { if (!S.cara) S.cara = {wag:[], log:[], earned:0, n:0}; return S.cara; }
const caraTowns = () => EXP_TOWNS.map(t => t.id).filter(townOpen);
const townGoods = t => [...new Set(TOWNC[t].stalls.flatMap(s => s.items.filter(x => x[1] <= expLv(t)).map(x => x[0])))].filter(id => INGI[id] != null);
function dayR(...k) { let h = gday() * 2654435761 >>> 0; for (const s of k) for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return (h % 10000) / 10000; }
const cBuy = (t, id) => Math.max(1, Math.round(ING[INGI[id]].value * (.72 + .22 * dayR('b', t, id))));
const cSell = (t, id) => Math.max(1, Math.round(ING[INGI[id]].value * (townGoods(t).includes(id) ? .8 : 1.25 + .55 * dayR('s', t, id))));
const caraDays = (a, b, w) => { const [x0, y0] = CARA_POS[a], [x1, y1] = CARA_POS[b]; return Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 40 * CARA_SPD[w.spd - 1])); };
function caraBest(a, b) { let best = null; for (const id of townGoods(a)) { const m = cSell(b, id) - cBuy(a, id); if (!best || m > best[1]) best = [id, m]; } return best && best[1] > 0 ? best[0] : null; }
function caraLog(s) { const C_ = caraSt(); C_.log.unshift(`${monthName()}${dayInMonth()}日 ${s}`); C_.log = C_.log.slice(0, 12); }
function caraDepart(w) {
  const a = w.from, b = w.to, id = w.mode === 'auto' ? caraBest(a, b) : (townGoods(a).includes(w.mode) ? w.mode : caraBest(a, b));
  w.cargo = null;
  if (id) { const per = cBuy(a, id) * 10; let n = Math.min(CARA_CAP[w.cap - 1], Math.floor(S.gold * .5 / (per * (w.guard ? 1.04 : 1)))); if (n > 0) { const cost = n * per; S.gold -= Math.round(cost * (w.guard ? 1.04 : 1)); w.cargo = {id, n, cost}; } }
  w.st = 'go'; w.dep = S.t; w.arr = S.t + caraDays(a, b, w) * 1440; w.storm = 0; dirty = true;
}
function caraArriveStop(w) { if (w.st === 'stopping') { w.st = 'idle'; caraLog(`${w.name}が${TOWN_SHORT[w.to]}で待機した`); [w.from, w.to] = [w.to, w.from]; return true; } return false; }
function caraArrive(w) {
  const sea = w.from === 'isle' || w.to === 'isle', grd = CARA_GRD[w.grd - 1];
  if (!w.storm && Math.random() < .08 * (1 - grd * .5) * (sea ? 1.5 : 1)) { w.storm = 1; w.arr += 1440; caraLog(`🌧 ${w.name}が${sea ? '時化' : '嵐'}で1日遅れている`); return; }
  let msg = '';
  if (w.cargo) {
    if (Math.random() < .10 * (1 - grd) * (w.guard ? .35 : 1)) { const lose = Math.max(1, Math.round(w.cargo.n * (.3 + Math.random() * .3))); w.cargo.n -= lose; msg = `（盗賊に${lose}箱うばわれた）`; }
    const get = w.cargo.n * 10 * cSell(w.to, w.cargo.id), prof = get - w.cargo.cost; S.gold += get; S.stat.earned = (S.stat.earned || 0) + Math.max(0, prof); caraSt().earned += prof;
    caraLog(`${w.name}：${TOWN_SHORT[w.to]}で${ingName(w.cargo.id)}${w.cargo.n}箱を売った ${prof >= 0 ? '+' : ''}${fmt(prof)}G${msg}`);
    if (typeof expAddXp === 'function') expAddXp(w.to, Math.round(Math.max(0, prof) / 200));
  } else caraLog(`${w.name}：${TOWN_SHORT[w.to]}に着いた（荷なし）`);
  if (TOWN_LEG[w.to]) legRoll(.03, TOWN_LEG[w.to], `${w.name}が${TOWNC[w.to].n}から持ち帰った。`);
  [w.from, w.to] = [w.to, w.from];
  if (w.st === 'stopping') { w.st = 'idle'; w.cargo = null; caraLog(`${w.name}が${TOWN_SHORT[w.from]}で待機した`); } else caraDepart(w);
}
function caravanStep() { if (!S.cara) return; for (const w of S.cara.wag) { let g = 0; while ((w.st === 'go' || w.st === 'stopping') && S.t >= w.arr && g++ < 5) caraArrive(w); } }
const wagLv = w => Math.min(5, Math.max(1, Math.round((w.cap + w.spd + w.grd) / 3)));
function wagIc(lv, px) { return `<div style="width:${px}px;height:${px}px;background:url(${IMG.wagons.src}) -${(lv - 1) * px}px 0/${px * 5}px ${px}px;image-rendering:pixelated"></div>`; }
function openCaravan() {
  if (!unl('caravan')) return gateMsg('caravan'); tut('caravan'); const C_ = caraSt(), towns = caraTowns();
  const nOpen = towns.length, mp = (nOpen > 1 && IMG['exp_map' + nOpen]) || IMG.exp_map;
  const marks = C_.wag.filter(w => w.st === 'go' || w.st === 'stopping').map(w => { const k = Math.min(1, (S.t - w.dep) / (w.arr - w.dep)), [x0, y0] = CARA_POS[w.from], [x1, y1] = CARA_POS[w.to], x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
    return `<img src="${IMG.cmark.src}" style="position:absolute;left:${x / 144 * 100 - 3}%;top:${y / 176 * 100 - 2}%;width:8%;image-rendering:pixelated">`; }).join('');
  const rows = C_.wag.map((w, i) => { const left = Math.max(0, w.arr - S.t), dd = Math.floor(left / 1440), hh = Math.floor(left % 1440 / 60);
    return `<div class="row">${wagIc(wagLv(w), U * 10)}<div class="t"><b>${w.name}</b><span>${w.st !== 'idle' ? `${w.st === 'stopping' ? '（着いたら待機）' : ''}${TOWN_SHORT[w.from]}→${TOWN_SHORT[w.to]}　着くまで ${dd}日${hh}時間<br>荷：${w.cargo ? ingName(w.cargo.id) + '×' + w.cargo.n + '箱' : 'なし'}${w.guard ? '　🛡護衛つき' : ''}${w.mode !== 'auto' ? '　（荷を指定）' : '　（おまかせ）'}` : '待機中（道を決めて出発）'}</span></div><div class="btn" data-wg="${i}">設定</div></div>`; }).join('');
  const nb = C_.wag.length < 5 ? `<div class="btn big ${S.gold >= CARA_BUY[C_.wag.length] ? 'grn' : 'dis'}" data-a="buyw">荷馬車を買う（${fmt(CARA_BUY[C_.wag.length])}G）</div>` : '';
  modal('交易キャラバン', `<img src="${IMG.cara_banner.src}" style="width:100%;image-rendering:pixelated;border-radius:4px">
    <div class="p">町と町を荷馬車が行き来して、安い町で買った荷を高い町で売る（留守・放置中も）。1箱＝10個。荷の代金は出発のときに所持金から払う（所持金の半分まで）。<br>これまでのもうけ <b>${fmt(C_.earned)}G</b></div>
    <div style="position:relative">${`<img src="${mp.src}" style="width:100%;image-rendering:pixelated;border-radius:4px">`}${marks}</div>
    ${rows || '<div class="p">まだ荷馬車がない。</div>'}${nb}<div class="btn" data-a="mkt" style="margin-top:3px">📈 今日の相場</div>
    <div class="h">旅の記録</div><div class="p" style="font-size:${U * 3.4}px">${C_.log.join('<br>') || 'まだ記録がない'}</div>`, 'cara');
  bind('[data-a=buyw]', () => { const k = C_.wag.length; if (k >= 5 || S.gold < CARA_BUY[k]) return; S.gold -= CARA_BUY[k]; C_.n = (C_.n || 0) + 1; C_.wag.push({name:['一号車', '二号車', '三号車', '四号車', '五号車'][k], cap:1, spd:1, grd:1, from:towns[0], to:towns[1] || towns[0], mode:'auto', guard:false, st:'idle', arr:0, dep:0, cargo:null}); sfx('ok'); dirty = true; openCaravanWagon(k); });
  bind('[data-wg]', d => openCaravanWagon(+d.wg));
  bind('[data-a=mkt]', () => openCaravanMarket());
}
function openCaravanWagon(i) {
  const C_ = caraSt(), w = C_.wag[i], towns = caraTowns();
  const tsel = (key) => towns.map(t => `<div class="btn ${w[key] === t ? 'grn' : ''}" data-tw="${key}:${t}" style="flex:1;padding:2px">${TOWN_SHORT[t]}</div>`).join('');
  const goods = townGoods(w.from).map(id => { const m = cSell(w.to, id) - cBuy(w.from, id); return `<div class="row">${ingIc(id, U * 8, false, true)}<div class="t"><b>${ingName(id)}</b><span>${TOWN_SHORT[w.from]}で${cBuy(w.from, id)}G → ${TOWN_SHORT[w.to]}で${cSell(w.to, id)}G（1個あたり${m >= 0 ? '+' : ''}${m}G）</span></div><div class="btn ${w.mode === id ? 'grn' : ''}" data-md="${id}">この荷</div></div>`; }).join('');
  const up = (k, nm, desc) => { const lv = w[k], c = 15000 * lv * lv; return `<div class="row"><div class="t"><b>${nm} Lv${lv}</b><span>${desc}</span></div>${lv < 5 ? `<div class="btn ${S.gold >= c ? '' : 'dis'}" data-up="${k}">強化<br>${fmt(c)}G</div>` : '<div class="btn dis">最大</div>'}</div>`; };
  modal(w.name, `<div class="h">道（出発する町 ⇔ 行き先の町）</div><div style="display:flex;gap:2px">${tsel('from')}</div><div style="text-align:center">⇅</div><div style="display:flex;gap:2px">${tsel('to')}</div>
    <div class="p">片道 ${w.from !== w.to ? caraDays(w.from, w.to, w) + '日' : '—'}。行き帰りをずっと繰り返す。</div>
    <div class="h">荷</div><div class="btn ${w.mode === 'auto' ? 'grn' : ''}" data-md="auto">おまかせ（毎回いちばんもうかる荷）</div>${goods}
    <div class="row"><div class="t"><b>護衛を雇う</b><span>荷の代金の4%で、盗賊に会いにくくなる（×0.35）</span></div><div class="btn ${w.guard ? 'grn' : ''}" data-a="grd">${w.guard ? '雇っている' : '雇わない'}</div></div>
    <div class="h">荷馬車の強化</div>${up('cap', '荷台', `積める箱 ${CARA_CAP[w.cap - 1]}${w.cap < 5 ? '→' + CARA_CAP[w.cap] : ''}`)}${up('spd', '車輪', `旅の日数 ×${CARA_SPD[w.spd - 1]}`)}${up('grd', '護衛隊', `盗賊・嵐を防ぐ ${Math.round(CARA_GRD[w.grd - 1] * 100)}%`)}
    ${w.st !== 'idle' ? '<div class="btn big" data-a="stop">止める（次に着いた町で待機）</div>' : `<div class="btn big ${w.from !== w.to ? 'grn' : 'dis'}" data-a="go">出発</div>`}<div class="btn" data-a="back" style="margin-top:3px">もどる</div>`, 'caraw');
  bind('[data-tw]', d => { if (w.st !== 'idle') return toast('走っている間は道を変えられない。止めて待機させてから'); const [k, t] = d.tw.split(':'); w[k] = t; if (!townGoods(w.from).includes(w.mode)) w.mode = 'auto'; openCaravanWagon(i); });
  bind('[data-md]', d => { w.mode = d.md; dirty = true; openCaravanWagon(i); });
  bind('[data-a=grd]', () => { w.guard = !w.guard; openCaravanWagon(i); });
  bind('[data-up]', d => { const lv = w[d.up], c = 15000 * lv * lv; if (lv >= 5 || S.gold < c) return; S.gold -= c; w[d.up]++; sfx('ok'); dirty = true; openCaravanWagon(i); });
  bind('[data-a=go]', () => { if (w.from === w.to) return; caraDepart(w); caraLog(`${w.name}が${TOWN_SHORT[w.from]}を出発した`); sfx('ok'); openCaravan(); });
  bind('[data-a=stop]', () => { w.st = 'stopping'; openCaravanWagon(i); });
  bind('[data-a=back]', () => openCaravan());
}
function openCaravanMarket() {
  const towns = caraTowns();
  modal('今日の相場', `<div class="p">町の品は毎日値段が変わる。地元の品は安く買えて、ほかの町では高く売れる（1個あたり）。</div>` + towns.map(a => `<div class="h">${TOWNC[a].n}で買える物</div>` + townGoods(a).map(id => { const best = towns.filter(b => b !== a).map(b => [b, cSell(b, id)]).sort((x, y) => y[1] - x[1])[0];
    return `<div class="row">${ingIc(id, U * 8, false, true)}<div class="t"><b>${ingName(id)}　${cBuy(a, id)}G</b><span>${best ? `いちばん高く売れる町：${TOWN_SHORT[best[0]]} ${best[1]}G` : ''}</span></div></div>`; }).join('')).join('') + '<div class="btn" data-a="back">もどる</div>', 'caram');
  bind('[data-a=back]', () => openCaravan());
}

// ====================================================== MINE (地下迷宮)
const GEAR = D.gear;
GEAR.forEach(g => {
  TOOLS.push({id:'pk' + g.tier, name:g.name + 'のツルハシ', kind:'pick', tier:g.tier, price:g.price, icon:g.pick, unlock:g.unlock, desc:`採掘力${(g.tier * 1.5).toFixed(1)}。${g.tier}段階目のツルハシ`});
  TOOLS.push({id:'sw' + g.tier, name:g.name + 'の剣', kind:'sword', tier:g.tier, price:Math.round(g.price * .9), icon:g.sword, unlock:g.unlock, desc:`攻撃力${2 + g.tier * 3}。${g.tier}段階目の剣`});
  TOOL_DUR['pk' + g.tier] = 60 + g.tier * 30; TOOL_DUR['sw' + g.tier] = 50 + g.tier * 25;
});
TOOLS.forEach(t => TOOLI[t.id] = t);
const ROCKS = ['stone','copper','iron','coal','silver','amethyst','gold','ruby','sapphire','emerald','diamond','moonstone','meitetsu','yasho','hoshikui','naraku'];
const ROCKREQ = {stone:1, copper:1, coal:1, iron:1, silver:2, amethyst:2, gold:2, ruby:3, sapphire:3, emerald:4, diamond:4, moonstone:5, meitetsu:5, yasho:6, hoshikui:7, naraku:7};
const ROCKHP = {stone:2, copper:3, coal:3, iron:4, silver:5, amethyst:6, gold:7, ruby:8, sapphire:9, emerald:10, diamond:12, moonstone:12, meitetsu:15, yasho:18, hoshikui:22, naraku:26};
// v0.58：深い階の岩からも、石炭（どこでも多め）とそれまでの層の鉱石が出る
function shallowMix(L, li) { const r = {...L.rocks}; if (li > 0 && ROCKS.includes('coal')) { r.coal = Math.max(r.coal || 0, 10); for (let j = 0; j < li && j < LAYERS.length; j++) for (const k in LAYERS[j].rocks) if (k !== 'stone' && !r[k] && ROCKS.includes(k) && !/amethyst|ruby|sapphire|emerald|diamond|moonstone/.test(k)) r[k] = 3; } return r; }
const LAYERS = [
  {n:'土の坑道', rocks:{stone:60, copper:20, coal:12, iron:8}, mons:['boar','bat'], forage:['cave_mushroom','rock_salt']},
  {n:'水晶洞', rocks:{stone:50, iron:15, silver:20, amethyst:10, copper:5}, mons:['slime','bat'], forage:['glow_moss','rock_salt']},
  {n:'溶岩層', rocks:{stone:50, silver:12, gold:22, ruby:10, coal:6}, mons:['lizard','slime'], forage:['rock_salt','magma_pepper']},
  {n:'氷窟', rocks:{stone:50, gold:12, sapphire:18, emerald:12, silver:8}, mons:['icebeast','slimei'], forage:['ice_berry','frost_herb']},
  {n:'奈落', rocks:{stone:45, emerald:10, diamond:16, moonstone:12, gold:10, ruby:7}, mons:['darkbird','shade','slimed'], forage:['abyss_fruit']},
  {n:'奈落の底', rocks:{stone:45, diamond:12, moonstone:12, meitetsu:16, yasho:10, hoshikui:5}, mons:['meibeast','shade','darkbird'], forage:['abyss_fruit','star_honey']},
];
const MONT = {
  boar:{n:'地底イノシシ', hp:9, atk:4, spd:20, drop:[['boar', .7]]}, bat:{n:'コウモリ', hp:6, atk:3, spd:34, fly:1, drop:[['cave_mushroom', .4]]},
  slime:{n:'スライム', hp:13, atk:5, spd:16, drop:[['slime_jelly', .8]]}, slimei:{n:'氷スライム', hp:20, atk:7, spd:18, drop:[['slime_jelly', .6], ['ice_berry', .3]]},
  slimed:{n:'闇スライム', hp:28, atk:9, spd:20, drop:[['slime_jelly', .5], ['abyss_fruit', .25]]}, lizard:{n:'火トカゲ', hp:26, atk:8, spd:24, drop:[['lizard_tail', .7]]},
  icebeast:{n:'氷の獣', hp:26, atk:8, spd:22, drop:[['icebeast_meat', .7]]}, darkbird:{n:'闇鶏', hp:32, atk:10, spd:28, drop:[['dark_chicken', .7]]},
  shade:{n:'影', hp:30, atk:11, spd:24, fly:1, drop:[['abyss_fruit', .4]]}, meibeast:{n:'冥獣', hp:50, atk:14, spd:22, drop:[['meikemono', .6]]},
};
const LAKE = ['blindfish','catfish','eel'];

// ===== v0.39: 町ごとの専用ダンジョン・ボス・呪いの迷宮
const DGD = {
  ship:{n:'沈没船', town:'port', ic:'⚓', boss:'kraken', mons:['skel', 'acrab', 'moray'], mats:['ship_rum', 'kani_yoroi', 'utsubo'], bm:'kraken_leg', eqf:22, gold:20000, gp:40, ring:'ring_kraken',
    d:'港の沖の岩場に沈んだ古い帆船。引き潮のあいだだけ、船の中に入れる。最奥の船倉に大海魔がひそむ。', rocks:{stone:50, iron:15, silver:20, gold:10, amethyst:5}, blk:[[100, 154, 133, 171]]},
  temple:{n:'砂の神殿', town:'desert', ic:'🏺', boss:'anukus', mons:['mummy', 'scorp', 'scarab'], mats:['ancient_spice', 'scorp_meat', 'scarab_honey'], bm:'anukus_wheat', eqf:32, gold:45000, gp:60, ring:'ring_anukus',
    d:'砂丘に埋もれた古代の神殿。黄金の番人が、王の眠る間を守っている。', rocks:{stone:45, gold:20, ruby:15, sapphire:10, silver:10}, blk:[[89, 124, 121, 141]]},
  shrine:{n:'竹林の祠', town:'tea', ic:'⛩', boss:'kyubi', mons:['takeoni', 'kitsune', 'kasa'], mats:['oni_takenoko', 'kitsune_age', 'kasa_kinoko'], bm:'kyubi_momo', eqf:42, gold:80000, gp:80, ring:'ring_kyubi',
    d:'竹林の奥の岩屋に続く、古い祠の参道。九つの尾を持つ妖狐がすむという。', rocks:{stone:45, emerald:15, sapphire:15, diamond:10, gold:15}, blk:[[103, 85, 127, 111]]},
  castle:{n:'氷の古城', town:'capital', ic:'❄', boss:'glacies', mons:['iknight', 'yuki', 'iwolf'], mats:['frost_salt', 'yuki_wata', 'iwolf_meat'], bm:'glacies_meat', eqf:50, gold:130000, gp:100, ring:'ring_glacies',
    d:'王都の北の崖に立つ、凍りついた古い城。玉座の間に氷竜が眠っている。', rocks:{stone:45, diamond:15, moonstone:15, sapphire:15, emerald:10}, blk:[]},
  volcano:{n:'火山の洞窟', town:'isle', ic:'🌋', boss:'kahana', mons:['mgolem', 'fbird', 'msnake'], mats:['magma_salt', 'fbird_egg', 'msnake_meat'], bm:'kahana_imo', eqf:62, gold:200000, gp:130, ring:'ring_kahana',
    d:'ルルアの火山のふもとに口を開けた溶岩洞。火口の底で炎の巨人が目を覚ます。', rocks:{stone:40, ruby:20, meitetsu:15, yasho:15, hoshikui:10}, blk:[[7, 92, 46, 112], [98, 172, 137, 194]]},
  mirror:{n:'鏡の回廊', town:'mirror', ic:'🪞', boss:'mshop', mons:['gslime', 'shardf', 'gmoth', 'mimicm', 'dopp', 'mknight'], mats:['kagami_jelly', 'kakera_ame', 'rinpun', 'sugami_shita', 'kage_niku', 'yoroigai'], bm:'mirror_spice', eqf:72, gold:400000, gp:200, ring:'ring_mirror', fl:20,
    d:'うつしの姿見の奥に続く、鏡ばかりの長い回廊。最奥の「裏の厨房」で、もう一人の店主が待っている。', rocks:{stone:35, diamond:15, moonstone:20, yasho:15, hoshikui:15}, blk:[[14, 66, 32, 94], [112, 66, 132, 96], [14, 150, 32, 180], [112, 150, 132, 180], [80, 126, 120, 152]]},
};
const DG_KEYS = Object.keys(DGD), BOSS_KEYS = DG_KEYS.map(k => DGD[k].boss);
Object.assign(MONT, {
  skel:{n:'骸骨の水夫', hp:40, atk:11, spd:22, drop:[['ship_rum', .5]]}, acrab:{n:'鎧ガニ', hp:55, atk:10, spd:14, drop:[['kani_yoroi', .6]]}, moray:{n:'牙ウツボ', hp:35, atk:13, spd:30, drop:[['utsubo', .6]]},
  mummy:{n:'包帯の亡者', hp:60, atk:14, spd:16, drop:[['ancient_spice', .5]]}, scorp:{n:'砂サソリ', hp:45, atk:17, spd:28, drop:[['scorp_meat', .6]]}, scarab:{n:'黄金スカラベ', hp:40, atk:13, spd:30, drop:[['scarab_honey', .5]]},
  takeoni:{n:'竹の子鬼', hp:70, atk:19, spd:24, drop:[['oni_takenoko', .6]]}, kitsune:{n:'狐火', hp:55, atk:22, spd:32, fly:1, drop:[['kitsune_age', .5]]}, kasa:{n:'からかさ', hp:65, atk:20, spd:22, drop:[['kasa_kinoko', .6]]},
  iknight:{n:'氷の騎士', hp:120, atk:25, spd:16, drop:[['frost_salt', .6]]}, yuki:{n:'雪の精', hp:80, atk:23, spd:26, fly:1, drop:[['yuki_wata', .5]]}, iwolf:{n:'氷狼', hp:95, atk:27, spd:34, drop:[['iwolf_meat', .6]]},
  mgolem:{n:'溶岩ゴーレム', hp:160, atk:30, spd:14, drop:[['magma_salt', .6]]}, fbird:{n:'火の鳥', hp:100, atk:28, spd:36, fly:1, drop:[['fbird_egg', .4]]}, msnake:{n:'マグマ蛇', hp:120, atk:32, spd:26, drop:[['msnake_meat', .6]]},
  kraken:{n:'大海魔クラーケン', hp:1700, atk:16, spd:12, boss:1, drop:[]}, anukus:{n:'黄金の番人アヌクス', hp:3000, atk:21, spd:14, boss:1, drop:[]},
  kyubi:{n:'九尾の妖狐', hp:4800, atk:27, spd:22, boss:1, drop:[]}, glacies:{n:'氷竜グラシエス', hp:7500, atk:36, spd:12, boss:1, drop:[]}, kahana:{n:'炎の巨人カハナ', hp:9000, atk:44, spd:12, boss:1, drop:[]},
  gslime:{n:'鏡スライム', hp:200, atk:36, spd:20, drop:[['kagami_jelly', .6]]}, shardf:{n:'かけらの精', hp:170, atk:40, spd:32, fly:1, drop:[['kakera_ame', .5]]}, gmoth:{n:'ガラス蛾', hp:160, atk:38, spd:36, fly:1, drop:[['rinpun', .5]]},
  mimicm:{n:'姿見もどき', hp:260, atk:42, spd:16, drop:[['sugami_shita', .6]]}, dopp:{n:'影うつし', hp:220, atk:44, spd:30, drop:[['kage_niku', .6]]}, mknight:{n:'銀鏡の騎士', hp:300, atk:46, spd:18, drop:[['yoroigai', .6]]},
  mshop:{n:'鏡の店主', hp:14000, atk:46, spd:16, boss:1, drop:[]},
});
// ボスの大技：c＝丸（x,y,r）、l＝帯（x0,y0,x1,y1,w）。予告（赤）→ 一撃
const BOSSP = {
  kraken:{pat:['tent', 'ink', 'ring'], minion:'moray', say:'船倉の闇から、巨大な触手がのびてきた！'},
  anukus:{pat:['cross', 'ring', 'sun'], minion:'mummy', say:'黄金の番人が杖を鳴らした。「王の眠りをさまたげる者よ……」'},
  kyubi:{pat:['foxfire', 'dash', 'tent'], minion:'kitsune', say:'九つの尾が青い火をともした。「ふふ、遊んでおくれ」'},
  glacies:{pat:['breath', 'hail', 'ring'], minion:'iwolf', say:'玉座の氷竜が目を開けた。吹雪が吹きこむ！'},
  kahana:{pat:['erupt', 'ring', 'cross', 'breath'], minion:'mgolem', say:'火口の底から炎の巨人が立ち上がった！'},
  mshop:{pat:['cross', 'foxfire', 'dash', 'ring', 'ink'], minion:'dopp', say:'割れた大鏡から、もう一人の店主が身を乗り出した。「その店の味、どちらが本物か決めようか」'},
};
function dgSt() { if (!S.dg) S.dg = {best:{}, kb:{}, wk:{}, kills:0, cl:0, cur:null, ret:null, clMax:0}; for (const k of ['best', 'kb', 'wk']) if (!S.dg[k]) S.dg[k] = {}; return S.dg; }
const dgOfTown = t => DG_KEYS.find(k => DGD[k].town === t);
const dgOpen = k => unl('dungeon') && townOpen(DGD[k].town);
const DG_RI = {}; DG_KEYS.forEach(k => DG_RI[k] = REC.map((r, i) => r.ings.some(id => { const g = ING[INGI[id]]; return g && g.src[0] === 'dungeon' && g.src[1] === k; }) ? i : -1).filter(i => i >= 0));
const curseL = () => (FL && FL.curse) || 0;
const curseDrop = () => 1 + .5 * curseL();
const curseCost = L => 2000 * L * L;
const BOSS_RINGS = DG_KEYS.map(k => DGD[k].ring);
const dgRingN = () => (FL && (FL.dg || FL.curse)) ? BOSS_RINGS.filter(id => gearAccOn(id)).length : 0;
function mkMon(k, x, y, sc, cl) { const m = MONT[k]; return {k, x, y, hp:Math.round(m.hp * sc * (1 + .4 * cl)), max:Math.round(m.hp * sc * (1 + .4 * cl)), atk:Math.round(m.atk * sc * (1 + .25 * cl)), spd:m.spd, cd:0, kb:0, wait:rnd(0, 2), path:[]}; }
function applyCurse(fl, cl) {
  fl.curse = cl; if (!cl) return;
  for (const m of fl.mons) { if (m.boss) continue; m.hp = m.max = Math.round(m.max * (1 + .4 * cl)); m.atk = Math.round(m.atk * (1 + .25 * cl)); }
  if (fl.mons.length && !fl.boss) { const pool = fl.dg ? DGD[fl.dg].mons : (fl.v ? DEEP_MONS : LAYERS[layerOf(fl.f)].mons), sc = fl.mons[0].max / MONT[fl.mons[0].k].hp / (1 + .4 * cl);
    for (let i = 0; i < Math.round(cl * .6); i++) { const p = randWalk(fl); fl.mons.push(mkMon(pick(pool), p[0], p[1], sc, cl)); } }
}
function genDgFloor(dg, f) {
  const M = mineState(), G = DGD[dg], D_ = dgSt(), cl = M.cl || 0;
  const fl = {f, dg, eqf:G.eqf + f, rocks:[], mons:[], ladder:null, broken:0, special:null, elevator:false, lake:null, chest:null, lava:false, blk:G.blk.slice()};
  if (dg === 'tower') genTwFloor(fl, f);
  else if (f > (G.fl || 10)) {   // 最奥：ボスの間
    fl.boss = true; fl.blk = [];
    if (dg === 'volcano') fl.walkFn = (x, y) => (((x - 72) / 50) ** 2 + ((y - 158) / 40) ** 2 < 1) || (x >= 66 && x <= 78 && y < 124);
    const b = mkMon(G.boss, 72, 150, 1, 0); b.boss = 1; b.hp = b.max = Math.round(b.max * (1 + .4 * cl)); b.atk = Math.round(b.atk * (1 + .2 * cl)); fl.mons.push(b);
  } else {
    const r = Math.random(); if (r < .12) fl.special = 'chest'; else if (r < .22) fl.special = 'nest';
    if (fl.special === 'chest') fl.chest = {x:64, y:132, open:false};
    const n = fl.special === 'nest' ? 8 : 16, w = Object.entries(G.rocks).map(([k, v]) => ({k, w:v}));
    const bad = (x, y) => (x > 54 && x < 90 && y < 66) || (fl.chest && Math.abs(x - fl.chest.x) < 20 && Math.abs(y - fl.chest.y) < 18) || fl.blk.some(b => x + 16 > b[0] && x < b[2] && y + 13 > b[1] && y < b[3]);
    for (let i = 0; i < n; i++) for (let t = 0; t < 30; t++) {
      const x = Math.round(rnd(14, 116)), y = Math.round(rnd(52, 222));
      if (bad(x, y) || fl.rocks.some(o => Math.abs(o.x - x) < 16 && Math.abs(o.y - y) < 14)) continue;
      const k = wpick(w).k; fl.rocks.push({x, y, k, hp:ROCKHP[k], max:ROCKHP[k]}); break;
    }
    const mc = fl.special === 'nest' ? 6 : 2 + (Math.random() < .6 ? 1 : 0) + (f >= 6 ? 1 : 0), sc = 1 + ((G.fl || 10) > 10 ? .02 : .03) * (f - 1);
    for (let i = 0; i < mc; i++) { const p = randWalk(fl); fl.mons.push(mkMon(pick(G.mons), p[0], p[1], sc, 0)); }
  }
  if (!fl.boss) { if (isFullMoon()) { const p = randWalk(fl); fl.mons.push(mkMon('mslime', p[0], p[1], 1 + G.eqf * .025, 0)); } secretPlace(fl); }
  FL = fl; applyCurse(fl, cl); M.floor = 0; D_.cur = {dg, f, cl}; D_.best[dg] = Math.max(D_.best[dg] || 0, f);
  buildMineWalk(); return fl;
}
function dgEnterMsg() {
  if (!FL || !FL.dg) return; const G = DGD[FL.dg];
  if (FL.boss) { tut('dg_boss'); const B = FL.mons.find(m => m.boss); if (B) setTimeout(() => toast(`👑 <b>${MONT[B.k].n}</b>　${BOSSP[B.k].say}`, 4000), 400); }
  else if (FL.f === (G.fl || 10)) toast(`${G.n} ${FL.f}階：この先が最奥。階段の先にボスが待つ。`, 3500);
}
function dgReturn() { const D_ = dgSt(); if (D_.ret === 'guild') return ['guild', 64, 264]; if (D_.ret === 'well') return ['outside', 46, 222]; const t = D_.ret || 'port'; return [t, ...(TOWNC[t].arrive || [72, 260])]; }
function exitDg() { const M = mineState(), D_ = dgSt(), r = dgReturn(); M.hp = M.hpMax; M.st = M.stMax; M.trip = {}; M.cl = 0; FL = null; D_.cur = null; player.mining = player.target = null; go(r[0], r[1], r[2]); }
function enterDg(dg, f) { const M = mineState(); M.hp = M.hpMax; M.st = M.stMax + (gearAccOn('ring_stam') ? 20 : 0); M.trip = {}; M.buff = {}; M.revive = 0; M.charm = 0; M.seraRev = 0; genDgFloor(dg, f); closeModal(); go('mine', 72, 52); setTimeout(dgEnterMsg, 300); }
function curseUI(cur) {
  if (!unl('curse')) return '';
  return `<div class="h">呪いの石像</div><div style="display:flex;gap:${U}px;align-items:center"><img src="${IMG.curse_statue.src}" style="width:${U * 12}px;image-rendering:pixelated"><div class="p" style="flex:1">供え物をすると、この回だけ呪いがかかる。段階ごとに魔物の体力+40%・攻撃+25%・数が増え、<b>落とし物・お金・装備が出る確率が+50%</b>、レア度も上がる。</div></div>
    <div style="display:flex;gap:2px">${[0, 1, 2, 3, 4, 5].map(L => `<div class="btn ${cur === L ? (L ? 'red' : 'grn') : ''}" data-cl="${L}" style="flex:1;padding:2px">${L ? '呪' + L : 'なし'}</div>`).join('')}</div>
    <div class="p">${cur ? `呪い${cur}：供え物 ${fmt(curseCost(cur))}G（入るときに払う）　落とし物×${(1 + .5 * cur).toFixed(1)}` : '呪いなし'}</div>`;
}
function payCurse() { const M = mineState(), L = dgSt().cl || 0; if (!L || !unl('curse')) { M.cl = 0; return true; } if (S.gold < curseCost(L)) { toast('供え物のお金が足りない'); return false; } S.gold -= curseCost(L); M.cl = L; return true; }
function openDgEntry(dg, ret) {
  if (!unl('dungeon')) return gateMsg('dungeon'); tut('dungeon');
  const G = DGD[dg], D_ = dgSt(), best = D_.best[dg] || 0, wk = Math.floor(gday() / 7), full = D_.wk[dg] !== wk, cl = unl('curse') ? (D_.cl || 0) : 0;
  const nf = G.fl || 10, mid = Math.floor(nf / 2) + 1, starts = [[1, '1階から入る']]; if (D_.mark && D_.mark.dg === dg && D_.mark.f > 1) starts.unshift([-D_.mark.f, `📜 帰還の印：${D_.mark.f}階から再開（1回だけ）`]); if (best >= mid) starts.push([mid, mid + '階から入る']); if ((D_.kb[dg] || 0) > 0) starts.push([nf + 1, '最奥（ボスの間）へ直行']);
  modal(G.n, `<img src="${IMG['dg_gate_' + dg].src}" style="width:100%;image-rendering:pixelated;border-radius:4px">
    <div class="p">${G.d}<br>全${nf}階＋最奥。魔物：${G.mons.map(k => MONT[k].n).join('・')}。最奥のボス：<b>${MONT[G.boss].n}</b><br>これまでの最深 ${best ? (best > nf ? '最奥' : best + '階') : 'まだ入っていない'}　ボスを倒した回数 ${D_.kb[dg] || 0}回</div>
    <div class="p">今週のボスのごほうび：${full ? '<b style="color:#8ad86a">まだ受け取っていない（全部もらえる）</b>' : `受け取り済み（あと${7 - gday() % 7}日で戻る。それまでは少なめ）`}</div>
    ${curseUI(cl)}${starts.map(([f, lb]) => `<div class="btn big ${f < 0 ? 'grn' : f === nf + 1 ? 'red' : f > 1 ? 'blu' : ''}" data-df="${f}" style="margin-top:${U}px">${lb}</div>`).join('')}`, 'dgentry');
  bind('[data-cl]', d => { D_.cl = +d.cl; tut('curse'); openDgEntry(dg, ret); });
  bind('[data-df]', d => { if (!payCurse()) return; D_.ret = ret || G.town; let f = +d.df; if (f < 0) { f = -f; D_.mark = null; } enterDg(dg, f); });
}
function openDgList(ret) {
  if (!unl('dungeon')) return gateMsg('dungeon');
  modal('転移陣', `<div class="p">ギルドの転移陣から、行ったことのある町の専用ダンジョンへ直接飛べる。出ると、ここに戻る。</div>` + DG_KEYS.map(k => { const ok = dgOpen(k);
    return `<div class="row"><div class="calev">${ok ? DGD[k].ic : '🔒'}</div><div class="t"><b>${DGD[k].n}</b><span>${ok ? TOWNC[DGD[k].town].n + '　ボス ' + MONT[DGD[k].boss].n : TOWNC[DGD[k].town].n + 'への道が開くと行ける'}</span></div>${ok ? `<div class="btn grn" data-dg="${k}">選ぶ</div>` : ''}</div>`; }).join(''), 'dglist');
  bind('[data-dg]', d => openDgEntry(d.dg, ret));
}
function dgChest() {
  const G = DGD[FL.dg], cm = curseDrop(), gold = Math.round((300 + Math.random() * 400) * (1 + G.eqf / 10) * cm); FL.chest.open = true; S.gold += gold; const got = [];
  for (let i = 0; i < 2; i++) { const id = pick(G.mats); giveBag('i', id, false, 1); tripAdd(id, 1); S.known.i[id] = true; got.push(ingName(id)); }
  const ores = Object.keys(G.rocks).filter(k => k !== 'stone'); { const k = pick(ores); giveBag('i', k, false, 2); tripAdd(k, 2); got.push(ingName(k) + '×2'); }
  sfx('ok'); toast(`宝箱から ${fmt(gold)}G と ${got.join('、')} を手に入れた！`, 4000); if (unl('arms') && Math.random() < .5 * accMul('luck') * cm) rollGearDrop(FL, 1); FL.chest = null; buildMineWalk();
}
// ---- ボスの動き
function playerHurt(atk, mul = 1) {
  { const M0 = mineState(), f0 = gearFx(); if (M0.invT > tNow) return false; if (f0.phantom && Math.random() < .15 * Math.min(2, f0.phantom)) { floatAt(player.x, player.y - 20, 'かわした', 'info'); return false; } skGain(4); }
  const M = mineState(), dmg = Math.max(1, Math.round(atk * mul * (buffOn('def') ? .6 : 1) * (1 - armorDef() - (outfitOn('knight') ? .05 : 0)) * forgeMulA() * defMulFx() / deepMul()));
  M.hp -= dmg; hurtT = .25; floatAt(player.x, player.y - 20, '-' + dmg, 'bad'); sfx('break'); if (M.hp <= 0) { mineDie(); return true; } return false;
}
function bossZones(m, p) {
  const px = player.x, py = player.y, bx = m.x, by = m.y - 8, Z = [], a = Math.atan2(py - by, px - bx), enr = !!m.enr;
  const line = (ang, len = 150, w = 16) => Z.push({t:'l', x0:bx, y0:by, x1:bx + Math.cos(ang) * len, y1:by + Math.sin(ang) * len, w});
  if (p === 'tent') { [-.45, 0, .45].forEach(o => line(a + o, 140, 13)); if (enr) [-.9, .9].forEach(o => line(a + o, 140, 13)); }
  else if (p === 'ink' || p === 'hail') { for (let i = 0; i < (enr ? 9 : 6); i++) Z.push({t:'c', x:px + rnd(-36, 36), y:py + rnd(-30, 30), r:13}); Z.push({t:'c', x:px, y:py, r:13}); }
  else if (p === 'ring') Z.push({t:'c', x:bx, y:by + 8, r:enr ? 46 : 38});
  else if (p === 'cross') { for (let k = 0; k < 4; k++) line(k * Math.PI / 2 + (enr ? Math.PI / 4 : 0), 170, 15); if (enr) for (let k = 0; k < 4; k++) line(k * Math.PI / 2, 170, 15); }
  else if (p === 'sun') { for (let k = 0; k < 3; k++) Z.push({t:'c', x:px + Math.cos(k * 2.1) * 20, y:py + Math.sin(k * 2.1) * 16, r:16}); Z.push({t:'c', x:px, y:py, r:12}); }
  else if (p === 'foxfire') { const n = enr ? 8 : 6; for (let k = 0; k < n; k++) Z.push({t:'c', x:px + Math.cos(k / n * 6.28) * 26, y:py + Math.sin(k / n * 6.28) * 20, r:11}); Z.push({t:'c', x:px, y:py, r:11}); }
  else if (p === 'dash') { const len = Math.min(140, Math.hypot(px - bx, py - by) + 30); line(a, len, 22); Z.dash = {x:Math.max(18, Math.min(126, bx + Math.cos(a) * len)), y:Math.max(56, Math.min(232, m.y + Math.sin(a) * len))}; }
  else if (p === 'breath') { for (const o of [-.3, 0, .3]) line(a + o, 160, 18); }
  else if (p === 'erupt') { for (let i = 0; i < (enr ? 12 : 8); i++) Z.push({t:'c', x:rnd(24, 120), y:rnd(110, 206), r:14}); Z.push({t:'c', x:px, y:py, r:14}); }
  return Z;
}
function inZone(z, x, y) {
  if (z.t === 'c') return ((x - z.x) / z.r) ** 2 + ((y - z.y) / (z.r * .75)) ** 2 < 1;
  const dx = z.x1 - z.x0, dy = z.y1 - z.y0, L2 = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((x - z.x0) * dx + (y - z.y0) * dy) / L2));
  return Math.hypot(x - (z.x0 + dx * t), y - (z.y0 + dy * t)) < z.w / 2;
}
function bossTick(m, dt) {
  const B = BOSSP[m.k], d = Math.hypot(player.x - m.x, player.y - m.y);
  if (!m.ai) m.ai = {t:2.2, zones:null, sum:12, flash:0, last:''};
  const ai = m.ai; if (ai.flash > 0) ai.flash -= dt; if (m.hitT > 0) m.hitT -= dt;
  if (!m.enr && m.hp < m.max * .3) { m.enr = 1; toast(`🔥 ${MONT[m.k].n}が怒り狂った！ 大技が速く、多くなる`, 3000); }
  if (ai.zones) {
    ai.zt -= dt * (m.slow > 0 ? .8 : 1);
    if (ai.zt <= 0) { const Z = ai.zones; ai.zones = null; ai.flash = .25; ai.fz = Z; sfx('break');
      if (Z.dash) { m.x = Z.dash.x; m.y = Z.dash.y; }
      if (Z.some(z => inZone(z, player.x, player.y))) { if (playerHurt(m.atk, 2.6)) return; }
      ai.t = m.enr ? 1.3 : 2.1; }
    return;
  }
  if (d > 24) { const sp = MONT[m.k].spd * dt * (m.enr ? 1.3 : 1) * (m.slow > 0 ? .6 : 1), nx = m.x + (player.x - m.x) / d * sp, ny = m.y + (player.y - m.y) / d * sp;
    if (walkable('mine', nx | 0, ny | 0)) { m.x = nx; m.y = ny; } }
  else if ((m.cd -= dt) <= 0) { m.cd = 2; if (playerHurt(m.atk, .7)) return; }
  m.flip = player.x < m.x;
  if ((ai.t -= dt) <= 0) { let p = pick(B.pat); if (p === ai.last && B.pat.length > 1) p = pick(B.pat); ai.last = p; ai.zones = bossZones(m, p); ai.zt = m.enr ? .8 : 1.15; }
  if ((ai.sum -= dt) <= 0) { ai.sum = m.enr ? 10 : 15; if (FL.mons.length < 6) { const sc = 1.27; for (let i = 0; i < 2; i++) { const p = randWalk(FL); FL.mons.push(mkMon(B.minion, p[0], p[1], sc, FL.curse || 0)); } toast(`${MONT[m.k].n}が手下の${MONT[B.minion].n}を呼んだ！`, 2200); } }
}
function drawBossLayer() {
  if (!FL || !FL.boss) return [];
  const m = FL.mons.find(x => x.boss), out = [];
  if (m && m.ai) { const ai = m.ai, zs = ai.zones || (ai.flash > 0 ? ai.fz : null);
    if (zs) { const k = ai.zones ? 1 - Math.max(0, ai.zt) / (m.enr ? .8 : 1.15) : 1;
      ctx.fillStyle = ai.zones ? `rgba(230,40,30,${.18 + .22 * k + Math.sin(tNow * 20) * .05})` : 'rgba(255,230,180,.6)'; ctx.strokeStyle = ai.zones ? 'rgba(255,90,70,.9)' : '#fff';
      for (const z of zs) { ctx.beginPath(); if (z.t === 'c') ctx.ellipse(z.x, z.y, z.r, z.r * .75, 0, 0, 7); else { const a = Math.atan2(z.y1 - z.y0, z.x1 - z.x0), ox = Math.sin(a) * z.w / 2, oy = -Math.cos(a) * z.w / 2;
        ctx.moveTo(z.x0 + ox, z.y0 + oy); ctx.lineTo(z.x1 + ox, z.y1 + oy); ctx.lineTo(z.x1 - ox, z.y1 - oy); ctx.lineTo(z.x0 - ox, z.y0 - oy); ctx.closePath(); } ctx.fill(); ctx.stroke(); } } }
  if (m) out.push({y:9998, f:() => { const w = 50, x = Math.round(Math.max(12, Math.min(82, m.x - 25))), y = Math.round(m.y - 50); ctx.fillStyle = '#140c08'; ctx.fillRect(x - 1, y - 1, w + 2, 5); ctx.fillStyle = m.enr ? '#ff7a2a' : '#c83a3a'; ctx.fillRect(x, y, Math.max(1, w * m.hp / m.max), 3);
    ctx.font = '5px sans-serif'; ctx.fillStyle = '#ffe8c0'; ctx.textAlign = 'center'; ctx.fillText(MONT[m.k].n + (FL.curse ? `（呪${FL.curse}）` : ''), x + 25, y - 2); ctx.textAlign = 'left'; }});
  return out;
}
function drawBoss(m) {
  const i = BOSS_KEYS.indexOf(m.k), bob = Math.sin(tNow * 3) * 1.5, tele = m.ai && m.ai.zones;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(m.x, m.y, 18, 5, 0, 0, 7); ctx.fill();
  if (m.enr) { ctx.fillStyle = `rgba(255,80,30,${.25 + Math.sin(tNow * 8) * .1})`; ctx.beginPath(); ctx.ellipse(m.x, m.y - 20, 26, 26, 0, 0, 7); ctx.fill(); }
  ctx.save(); ctx.translate(Math.round(m.x), Math.round(m.y - 44 + bob - (tele ? 2 : 0))); if (m.flip && (m.k === 'anukus' || m.k === 'kyubi')) ctx.scale(-1, 1);
  if (m.hitT > 0) ctx.filter = 'brightness(1.8)';
  ctx.drawImage(IMG.bosses, i * 48, 0, 48, 48, -24, 0, 48, 48); ctx.restore();
}
function bossIcHTML(k, px) { const i = BOSS_KEYS.indexOf(k); return `<div style="width:${px}px;height:${px}px;margin:auto;background:url(${IMG.bosses.src}) -${i * px}px 0/${px * BOSS_KEYS.length}px ${px}px;image-rendering:pixelated"></div>`; }
function bossNfx() { return 3 + (Math.random() < .35 ? 1 : 0) + (Math.random() < .1 ? 1 : 0); }
function bossDefeated(m) {
  if (FL.dg === 'tower') return twBossDefeated(m);
  const dg = FL.dg, G = DGD[dg], D_ = dgSt(), wk = Math.floor(gday() / 7), full = D_.wk[dg] !== wk, L = FL.curse || 0, cm = 1 + .5 * L, first = !(D_.kb[dg] > 0);
  if (L >= 3 && S.cp && S.cp.q && S.cp.q.k === 'mia') { S.cp.q.done = 1; setTimeout(() => toast('🏹 ミアの依頼を達成！ ギルド前に報告しよう', 4000), 1500); }
  if (full) D_.wk[dg] = wk; D_.kb[dg] = (D_.kb[dg] || 0) + 1; D_.kills = (D_.kills || 0) + 1; if (L) D_.clMax = Math.max(D_.clMax || 0, L);
  FL.mons = []; const lines = [];
  const gold = Math.round(G.gold * (full ? 1 : .15) * cm); S.gold += gold; S.stat.earned = (S.stat.earned || 0) + gold; lines.push(`賞金 +${fmt(gold)}G`);
  if (full && unl('guild')) { const gp = Math.round(G.gp * (1 + .2 * L) * (gearAccOn('ring_guild') ? 1.2 : 1)); guildState().gp += gp; lines.push(`ギルドポイント +${gp}`); }
  const nm = (full ? 3 : 1) + Math.floor(L / 2); giveBag('i', G.bm, false, nm); tripAdd(G.bm, nm); S.known.i[G.bm] = true; lines.push(`${ingName(G.bm)} ×${nm}`);
  if (unl('arms')) {
    const lm = accMul('luck') * (1 + .25 * L);
    if (first || Math.random() < (full ? .35 : .08) * lm) { const w = WEAP.filter(x => x.src === 'boss:' + dg), g = addGear(pick(w).id, 4, true, bossNfx()); lines.push(`<b style="color:${RAR_C[4]}">伝説・${gDef(g).name}</b>（効果${g.fx.length + 1}つ）`); }
    if (Math.random() < (full ? .25 : .05) * lm || (!first && D_.kb[dg] === 2)) { const g = addGear(G.ring, 4, true); lines.push(`<b style="color:${RAR_C[4]}">${gDef(g).name}</b>`); }
  }
  let learn = ''; if (dg === 'mirror' && first) setTimeout(() => popStory('<div class="tth">🪞 割れた鏡の向こうで</div><div class="ttx">もう一人の店主は、ひびの入った顔で笑った。<br>「……いい腕だ。その味、別の町角でも続けてみな。のれんは、分けるためにあるんだ」<br>鏡のかけらが光になって消えていった。</div>'), 600);
  if (skOn() && Math.random() < .12 * accMul('luck')) { const g = twDrop(2); if (g) lines.push(`<b style="color:${RAR_C[g.r]}">${RAR_N[g.r]}・${gNm(g)}</b>（銘の武器）`); }
  if (first) { const n = learnRecipes(DG_RI[dg]); if (n) learn = `<br>${G.n}の料理帖を見つけた：${DG_RI[dg].map(i => '『' + REC[i].name + '』').join('')}`; }
  sfx('ok'); tut('dg_reward');
  popStory(`<div class="tth">👑 ${MONT[m.k].n}を倒した！${L ? `（呪い${L}）` : ''}</div><div class="ttx">${full ? '今週のごほうびを全部もらった！' : '今週のごほうびは受け取り済み（少なめ）。'}<br>${lines.join('<br>')}${learn}<br><br>上のはしごから外へ出られる。</div>`);
  dirty = true;
}
// ===== v0.63 武器の銘（12系列）・効果の数値の幅・技・武器の成長と覚醒・霊峰の修練の塔
const SER = {
  enryu:{n:'炎竜', fx:{burn:1.6, might:.5}, d:'炎（強め）・攻撃+5%', sk:'技に炎がのり、当たった敵が強く燃える'},
  hyoga:{n:'氷牙', fx:{chill:1, guard:.6}, d:'冷気・受けるダメージ-5%', sk:'技で当たった敵が2秒こおりつく'},
  raimei:{n:'雷鳴', fx:{thunder:1, swift:.5}, d:'雷（近くの敵1体にも40%）・攻撃の速さ+7%', sk:'技のあと、まわりの敵に落雷'},
  tsukikage:{n:'月影', fx:{moon:1}, d:'会心+25%・会心でダメージ3倍', sk:'技がすべて会心になる'},
  kaijin:{n:'海神', fx:{knock:1.5, guard:.6}, d:'大きく吹き飛ばす・受けるダメージ-5%', sk:'技で大波：まわりの敵を遠くへ押し返す'},
  shukaku:{n:'収穫', fx:{butcher:1, forage:1, luck:.6}, d:'魔物の素材×1.5・採集物が見つかりやすい・落とし物+9%', sk:'技で倒した敵の素材が必ず落ちる'},
  bishoku:{n:'美食', fx:{magic2:1, regen:.6}, d:'料理のバフ時間+60%・体力がゆっくり回復', sk:'技を出すと体力が15%回復'},
  naraku:{n:'奈落', fx:{drain:1.6, might:1}, d:'吸血8%・攻撃+10%', sk:'技で与えたダメージの20%を吸う'},
  dokuja:{n:'毒蛇', fx:{poison:2}, d:'毒（強め）', sk:'技で当たった敵に猛毒'},
  seiko:{n:'聖光', fx:{regen:2, guard:.6}, d:'体力がよく回復・受けるダメージ-5%', sk:'技を出すと体力10%回復＋1.5秒ダメージを受けない'},
  genei:{n:'幻影', fx:{phantom:1, swift:1}, d:'15%で攻撃をかわす・攻撃の速さ+15%', sk:'分身がもう一度、半分の強さで技を出す'},
  ouke:{n:'王家', fx:{gold:1, luck:1.5}, d:'倒すとお金・落とし物+22%', sk:'技で倒すと金貨がたくさん落ちる'},
};
for (const k in SER) WFX['s_' + k] = SER[k].n + '：' + SER[k].d;
WFX.thunder = '雷：近くの敵1体にも雷（ダメージの40%）'; WFX.phantom = '幻影：15%で攻撃をかわす';
const SER_KEYS = Object.keys(SER);
const serOf = d => d && d.fx && d.fx.startsWith('s_') ? d.fx.slice(2) : null;
const SKILLS = {sword:{n:'回転斬り', d:'まわりの敵すべてに攻撃の3倍'}, dagger:{n:'連撃', d:'目の前の敵に6回切りつける'}, spear:{n:'突進突き', d:'敵へ突進して4倍、通り道の敵にも2倍'},
  hammer:{n:'大地割り', d:'まわりに3.5倍＋1.5秒ひるませる'}, bow:{n:'矢の雨', d:'ねらった敵のまわりすべてに2.2倍'}, staff:{n:'魔法陣', d:'3秒間、まわりの敵に何度も1.2倍'},
  knife:{n:'解体', d:'1体に6倍。倒すと素材が2倍'}, scythe:{n:'大旋風', d:'広くまわりに2.5倍、与えた分の10%を吸う'}, whip:{n:'縛り打ち', d:'近くの敵5体に2倍＋3秒動きを止める'}};
const skOn = () => unl('shugyo');
// 効果の数値の幅（0.6〜1.4倍。深い所・強い相手ほど上振れ）
const fxRoll = (b = 0) => Math.round((.6 + .8 * Math.pow(Math.random(), 1 / (1 + Math.max(0, b)))) * 100) / 100;
const fxQ = q => q == null ? '' : `<span style="color:${q >= 1.25 ? '#ffc850' : q >= 1 ? '#8ad86a' : '#c8b8a0'}">【${Math.round(q * 100)}%】</span>`;
// 武器の成長：Lv1〜20（攻撃+2%ずつ）→ 覚醒（×1.2、技×1.5、付与の枠+1）→ 覚醒Lv（上限なし、+1%ずつ）
const wNeed = g => g.aw ? 300 + 20 * (g.alv || 0) : 20 + 10 * (g.lv || 1);
const wGrowMul = g => (1 + .02 * (((g && g.lv) || 1) - 1)) * (g && g.aw ? 1.2 * (1 + .01 * (g.alv || 0)) : 1);
const canAwaken = d => d && (/^(series|legend|boss)/.test(d.src));
const gNm = g => { const d = gDef(g); return g.aw ? (d.name2 || '真・' + d.name) : d.name; };
const gIc = g => { const d = gDef(g); return g.aw && d.icon2 ? d.icon2 : d.icon; };
function wGain(m) {
  if (!skOn()) return; const g = eqW(); if (!g) return; const xp = m.boss ? 40 : 1 + Math.floor(((FL && FL.eqf) || 1) / 25);
  if (!g.aw && (g.lv || 1) >= 20) { g.xp = wNeed(g); return; }
  g.xp = (g.xp || 0) + xp; let up = 0;
  while (g.xp >= wNeed(g) && (g.aw || (g.lv || 1) < 20)) { g.xp -= wNeed(g); if (g.aw) g.alv = (g.alv || 0) + 1; else g.lv = (g.lv || 1) + 1; up = 1; }
  if (up) { sfx('ok'); floatAt(player.x, player.y - 30, g.aw ? `真・覚醒Lv${g.alv}` : `武器Lv${g.lv}`, 'info'); if (!g.aw && g.lv >= 20 && canAwaken(gDef(g))) toast(`✨ ${gNm(g)}がLv20になった！ 鍛冶屋の工房で<b>覚醒</b>できる`, 4000); tut('m_wgrow'); }
}
// ---- 技（ゲージ）
let SKFX = [];
function skGain(n) { if (!skOn() || !eqW()) return; const M = mineState(), was = (M.sk || 0) >= 100; M.sk = Math.min(100, (M.sk || 0) + n); if (!was && M.sk >= 100) { tut('m_skill'); sfx('tick'); } }
function useSkill() {
  const M = mineState(), g = eqW(); if (!FL || !g || (M.sk || 0) < 100 || !skOn()) return; const d = WEAPI[g.id], st = wStats(), f = gearFx(), ser = serOf(d), pw = g.aw ? 1.5 : 1;
  M.sk = 0; S.stat.skill = (S.stat.skill || 0) + 1;
  const base = st.base * st.m * (st.rm || 1) * forgeMulS() * atkMulFx(f) * wmMul() * deepMul() * pw * (buffOn('atk') ? 1.5 : 1);
  const dist = o => Math.hypot(o.x - player.x, o.y - player.y), near = r => FL.mons.filter(o => dist(o) < r);
  let tgt = player.target && FL.mons.includes(player.target) ? player.target : near(80).sort((a, b) => dist(a) - dist(b))[0];
  const H = [], add2 = (m, k) => { if (m) H.push([m, k]); };
  const T = d.type; let stun = 0;
  if (T === 'sword') near(30).forEach(o => add2(o, 3));
  else if (T === 'dagger') { if (tgt) for (let i = 0; i < 6; i++) add2(tgt, 1); }
  else if (T === 'spear') { if (tgt) { const a = Math.atan2(tgt.y - player.y, tgt.x - player.x), dd = Math.max(0, dist(tgt) - 12), nx = player.x + Math.cos(a) * dd, ny = player.y + Math.sin(a) * dd;
      FL.mons.filter(o => o !== tgt && Math.abs((o.x - player.x) * Math.sin(a) - (o.y - player.y) * Math.cos(a)) < 10 && dist(o) < dd + 10).forEach(o => add2(o, 2));
      if (walkable('mine', nx | 0, ny | 0)) { player.x = nx; player.y = ny; player.path = []; } add2(tgt, 4); } }
  else if (T === 'hammer') { near(34).forEach(o => add2(o, 3.5)); stun = 1.5; }
  else if (T === 'bow') { if (tgt) FL.mons.filter(o => Math.hypot(o.x - tgt.x, o.y - tgt.y) < 30).forEach(o => add2(o, 2.2)); }
  else if (T === 'staff') { const c = {x:player.x, y:player.y}; for (let k = 0; k < 6; k++) setTimeout(() => { if (!FL) return; FL.mons.filter(o => Math.hypot(o.x - c.x, o.y - c.y) < 38).forEach(o => skHit(o, base * 1.2 * monDmgMul(o.k), st, f, ser)); SKFX.push({x:c.x, y:c.y, r:38, t:.3, c:'#b08aff'}); }, k * 500); }
  else if (T === 'knife') { if (tgt) { tgt._buc = 2; add2(tgt, 6); } }
  else if (T === 'scythe') { near(40).forEach(o => add2(o, 2.5)); }
  else if (T === 'whip') { near(44).sort((a, b) => dist(a) - dist(b)).slice(0, 5).forEach(o => add2(o, 2)); stun = 3; }
  if (ser === 'hyoga') stun = Math.max(stun, 2);
  let dealt = 0;
  for (const [m, k] of H) { if (!FL.mons.includes(m)) continue; if (stun && !m.boss) m.kb = Math.max(m.kb || 0, stun); if (stun && m.boss) m.slow = Math.max(m.slow || 0, stun); dealt += skHit(m, base * k * monDmgMul(m.k), st, f, ser); }
  if (T === 'scythe') M.hp = Math.min(M.hpMax, M.hp + dealt * .1);
  if (ser === 'naraku') M.hp = Math.min(M.hpMax, M.hp + dealt * .2);
  if (ser === 'bishoku') M.hp = Math.min(M.hpMax, M.hp + M.hpMax * .15);
  if (ser === 'seiko') { M.hp = Math.min(M.hpMax, M.hp + M.hpMax * .1); M.invT = tNow + 1.5; }
  if (ser === 'raimei') setTimeout(() => { if (FL) near(60).slice(0, 4).forEach(o => { skHit(o, base * 1.2 * monDmgMul(o.k), st, f, null); SKFX.push({x:o.x, y:o.y - 10, r:8, t:.35, c:'#fff8a0'}); }); }, 300);
  if (ser === 'kaijin') near(50).forEach(o => { if (o.boss) return; const a = Math.atan2(o.y - player.y, o.x - player.x), nx = o.x + Math.cos(a) * 30, ny = o.y + Math.sin(a) * 20; if (walkable('mine', nx | 0, ny | 0)) { o.x = nx; o.y = ny; } o.kb = 1; });
  if (ser === 'genei') setTimeout(() => { if (!FL) return; for (const [m, k] of H) if (FL.mons.includes(m)) skHit(m, base * k * .5 * monDmgMul(m.k), st, f, null); SKFX.push({x:player.x + 8, y:player.y - 8, r:20, t:.4, c:'#e8d8ff'}); }, 400);
  SKFX.push({x:player.x, y:player.y, r:T === 'bow' || T === 'staff' ? 38 : 32, t:.45, c:{enryu:'#ff9a40', hyoga:'#a8e0ff', raimei:'#fff070', tsukikage:'#c8d8ff', kaijin:'#60e0f0', naraku:'#c080ff', dokuja:'#a8ff80', seiko:'#fff8d0', ouke:'#ffd860'}[ser] || '#ffe8c0'});
  wSwingT = .3; sfx('fanfare'); floatAt(player.x, player.y - 26, '技：' + SKILLS[T].n + (g.aw ? '・真' : ''), 'info'); dirty = true;
}
function skHit(m, dmg, st, f, ser) {
  if (!FL || !FL.mons.includes(m)) return 0; const crit = ser === 'tsukikage' || Math.random() < .2; if (crit) dmg *= f.moon ? 3 : 2;
  if (ser === 'enryu') { m.burn = 4; m.bdps = dmg * .3; } if (ser === 'dokuja') { m.pois = 5; m.pdps = dmg * .25; }
  if (ser === 'shukaku') m._buc = Math.max(m._buc || 0, 1.01);
  if (ser === 'ouke') m._gold = 1;
  const hp0 = m.hp; hitMon(m, dmg, st, f, crit, true); return Math.max(0, hp0 - Math.max(0, m.hp));
}
// ---- 修練の塔（霊峰）
const TW_N = '霊峰の修練の塔';
function twSt() { if (!S.tw) S.tw = {best:0, mk:0, clr:{}, kills:0}; return S.tw; }
const twBand = f => f <= 10 ? 0 : f <= 20 ? 1 : 2;
function twUnl() { if (!unl('shugyo') && unl('abyss') && (mineState().max || 0) >= 60) unlockFeature('shugyo'); }
Object.assign(MONT, {
  tw_imp:{n:'小鬼', hp:90, atk:28, spd:32, drop:[['sansai', .15]]}, tw_shield:{n:'盾持ちの石兵', hp:230, atk:34, spd:16, shield:1, drop:[['walnut', .3]]},
  tw_armor:{n:'鎧武者', hp:260, atk:40, spd:18, armor:.6, drop:[['matsutake', .2]]}, tw_monk:{n:'修行僧の亡霊', hp:150, atk:38, spd:30, drop:[['sansai', .3]]},
  tw_hawk:{n:'山の鷹', hp:110, atk:34, spd:42, fly:1, drop:[['walnut', .2]]},
  tw_golem:{n:'石の門番ゴーレム', hp:9000, atk:46, spd:12, boss:1, armor:.35, drop:[]}, tw_shogun:{n:'鎧の大将', hp:16000, atk:56, spd:16, boss:1, armor:.4, drop:[]},
  tw_tengu:{n:'天狗の大師範', hp:26000, atk:64, spd:22, boss:1, armor:.3, drop:[]},
});
Object.assign(BOSSP, {
  tw_golem:{pat:['ring', 'cross', 'erupt'], minion:'tw_imp', say:'石の門が動いた。「修行の者よ、その技を見せよ」　※鎧（青いゲージ）は技でしか割れない'},
  tw_shogun:{pat:['dash', 'cross', 'tent'], minion:'tw_armor', say:'鎧の大将が大太刀を抜いた。「技なき刃は、この鎧に通らぬ」'},
  tw_tengu:{pat:['foxfire', 'dash', 'breath', 'hail'], minion:'tw_hawk', say:'天狗の大師範が羽うちわをひと振り。嵐が巻き起こる！「よくぞ登った。最後の稽古をつけてやろう」'},
});
BOSS_KEYS.push(...(D.twboss || ['tw_golem', 'tw_shogun', 'tw_tengu']));
DGD.tower = {n:TW_N, town:null, ic:'🗼', boss:'tw_tengu', mons:['tw_imp', 'tw_shield', 'tw_armor', 'tw_monk', 'tw_hawk'], mats:['matsutake', 'sansai', 'walnut'], bm:'matsutake', eqf:80, gold:300000, gp:150, fl:30,
  d:'雲の上にそびえる石の塔。武人たちが技をみがいてきた修行の場。10階ごとに「階の主」が待つ。', rocks:{stone:50, diamond:10, moonstone:15, yasho:15, hoshikui:10}, blk:[]};
// 塔の強さは、あなたの深層の記録の85%の深さの魔物に合わせる（いつ登っても手ごたえがある）
const twScale = () => deepSc(Math.max(60, Math.floor(((S.mine && S.mine.max) || 60) * .85))) / deepSc(60);
function genTwFloor(fl, f) {
  const G = DGD.tower, sc = twScale() * (1 + .05 * (f - 1)), cl = fl.curse || 0;
  if (f === 10 || f === 20 || f > 30) { fl.boss = true; fl.twb = 1; const k = f === 10 ? 'tw_golem' : f === 20 ? 'tw_shogun' : 'tw_tengu', b = mkMon(k, 72, 150, twScale(), 0); b.boss = 1; b.arm = b.armMax = Math.round(b.max * MONT[k].armor * .6); fl.mons.push(b); return; }
  fl.special = 'nest'; const kind = pick(['swarm', 'armor', 'shield', 'mix']), list = kind === 'swarm' ? [...Array(7).fill('tw_imp'), 'tw_monk'] : kind === 'armor' ? ['tw_armor', 'tw_armor', 'tw_imp', 'tw_imp', 'tw_monk'] : kind === 'shield' ? ['tw_shield', 'tw_shield', 'tw_shield', 'tw_hawk'] : ['tw_shield', 'tw_armor', 'tw_monk', 'tw_hawk', 'tw_imp'];
  for (const k of list) { const p = randWalk(fl), m = mkMon(k, p[0], p[1], sc, 0); if (MONT[k].armor) m.arm = m.armMax = Math.round(m.max * MONT[k].armor); fl.mons.push(m); }
  fl.twk = kind; if (Math.random() < .14) { fl.chest = {x:64, y:132, open:false}; fl.special = 'nest'; }
}
function twFloorClear() { const T = twSt(), f = FL.f, first = !T.clr[f]; T.clr[f] = 1; T.mk += first ? 3 : 1; T.best = Math.max(T.best, f); return first ? 3 : 1; }
function twDrop(minR = 2, ser) {   // 銘の武器を1本（レア度は希少以上、数値は塔の高さで上振れ）
  const s = ser || pick(SER_KEYS), t = pick(Object.keys(WT_N)), w = WEAPI[`sr_${s}_${t}`]; if (!w) return null;
  const x = Math.random() / accMul('luck'), r = Math.max(minR, x < .08 ? 4 : x < .35 ? 3 : 2), g = addGear(w.id, r, true); g.q0 = fxRoll(FL ? (FL.f || 0) / 15 : 0); return g;
}
function twBossDefeated(m) {
  const T = twSt(), f = FL.f, first = !T.clr[f]; T.clr[f] = 1; T.best = Math.max(T.best, f); const mk = f > 30 ? 20 : 10; T.mk += mk; T.kills++;
  FL.mons = []; const lines = [`修練の証 +${mk}`]; const gold = f > 30 ? 120000 : f === 20 ? 60000 : 30000; S.gold += gold; lines.push(`賞金 +${fmt(gold)}G`);
  const g = twDrop(first ? 3 : 2); if (g) lines.push(`<b style="color:${RAR_C[g.r]}">${RAR_N[g.r]}・${gNm(g)}</b>（${WFX[gDef(g).fx].split('：')[0]}の銘 ${fxQ(g.q0)}）`);
  if (f > 30) { const D_ = dgSt(), wk = Math.floor(gday() / 7); D_.kb.tower = (D_.kb.tower || 0) + 1; if (first) S.stat.twTop = 1; }
  else { const p = [64, 120]; FL.ladder = {x:p[0], y:p[1]}; buildMineWalk(); }
  sfx('fanfare'); tut('m_tower');
  popStory(`<div class="tth">👑 ${MONT[m.k].n}を倒した！</div><div class="ttx">${lines.join('<br>')}<br><br>${f > 30 ? '塔の頂を極めた！ 上のはしごから外へ出られる。' : '階段が現れた。上の階へ進める。'}</div>`); dirty = true;
}
function openTowerEntry() {
  if (!unl('shugyo')) return toast('🔒 奈落の深層のB60にたどり着くと、霊峰の修練の塔へ行けるようになる。'); tut('m_tower');
  const T = twSt(), D_ = dgSt(), cl = unl('curse') ? (D_.cl || 0) : 0, starts = [[1, '1階から登る']];
  if (T.best >= 11) starts.push([11, '11階から登る（中層）']); if (T.best >= 21) starts.push([21, '21階から登る（上層）']); if (T.best >= 31) starts.push([31, '頂（天狗の大師範）へ直行']);
  modal(TW_N, `<img src="${IMG.dg_gate_tower.src}" style="width:100%;image-rendering:pixelated;border-radius:4px">
    <div class="p">${DGD.tower.d}<br>全30階＋頂。<b>技</b>が試される：<b>鎧</b>（青いゲージ）を着た敵は、技でしか鎧を割れない（ふつうの攻撃はほとんど効かない）／<b>盾持ち</b>はふつうの攻撃を7割防ぐ／<b>小鬼の大群れ</b>は技でまとめて倒そう。<br>どの階も、敵を全部倒すと階段が出る。</div>
    <div class="p">これまでの最高 ${T.best ? (T.best > 30 ? '頂' : T.best + '階') : 'まだ登っていない'}　修練の証 <b>${T.mk}</b>（覚醒と、銘の武器の交換に使う）</div>
    <div class="p">技：攻撃を当てるとゲージがたまり、満タンで画面上の「⚔技」を押す。今の武器の技：<b>${eqW() ? SKILLS[gDef(eqW()).type].n + '（' + SKILLS[gDef(eqW()).type].d + '）' : '（武器を装備しよう）'}</b></div>
    <div class="btn" data-a="ex" style="margin:${U}px 0">🎖 修練の証で銘の武器と交換する</div>
    ${curseUI(cl)}${starts.map(([f, lb]) => `<div class="btn big ${f === 31 ? 'red' : f > 1 ? 'blu' : ''}" data-tf="${f}" style="margin-top:${U}px">${lb}</div>`).join('')}`, 'tower');
  bind('[data-a=ex]', () => openTwShop());
  bind('[data-cl]', d => { D_.cl = +d.cl; tut('curse'); openTowerEntry(); });
  bind('[data-tf]', d => { if (!payCurse()) return; D_.ret = 'well'; enterDg('tower', +d.tf); });
}
let twShopS = 'enryu';
function openTwShop() {
  const T = twSt(), cost = 30;
  modal('修練の証の交換', `<div class="p">修練の証 <b>${T.mk}</b>。好きな銘・好きな種類の武器（希少）を、証${cost}で打ってもらえる。数値の幅はふつう〜上振れ。</div>
    <div class="seg many">${SER_KEYS.map(k => `<div class="${twShopS === k ? 'on' : ''}" data-ss="${k}">${SER[k].n}</div>`).join('')}</div>
    <div class="p"><b>${SER[twShopS].n}の銘</b>：${SER[twShopS].d}<br>技の追加効果：${SER[twShopS].sk}</div>` +
    Object.keys(WT_N).map(t => { const w = WEAPI[`sr_${twShopS}_${t}`]; if (!w) return ''; return `<div class="row">${icHTML(w.icon, U * 10, 'atlas')}<div class="t"><b>${w.name}</b><span>${WT_N[t]}／${WSUB[w.sub].n}　技：${SKILLS[t].n}</span></div><div class="btn ${T.mk >= cost ? 'grn' : 'dis'}" data-tb="${w.id}">証${cost}</div></div>`; }).join(''), 'twshop');
  bind('[data-ss]', d => { twShopS = d.ss; openTwShop(); });
  bind('[data-tb]', d => { if (T.mk < cost) return; T.mk -= cost; const g = addGear(d.tb, 2, false); g.q0 = fxRoll(.6); sfx('ok'); dirty = true; openTwShop(); });
}
function drawSkillLayer() {   // 技の光と、鎧のゲージ・技のゲージ
  const out = []; SKFX = SKFX.filter(e => (e.t -= 1 / 60) > 0);
  for (const e of SKFX) { ctx.strokeStyle = e.c; ctx.globalAlpha = Math.min(1, e.t * 3); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * (1.2 - e.t), e.r * .75 * (1.2 - e.t), 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1; }
  if (FL) for (const m of FL.mons) if (m.arm > 0 && !m.boss) { ctx.fillStyle = '#140c08'; ctx.fillRect(m.x - 7, m.y - 20, 14, 2); ctx.fillStyle = '#5ab0ff'; ctx.fillRect(m.x - 7, m.y - 20, Math.max(1, 14 * m.arm / m.armMax), 2); }
  const B = FL && FL.mons.find(x => x.boss && x.arm > 0); if (B) out.push({y:9999, f:() => { const x = Math.round(Math.max(12, Math.min(82, B.x - 25))), y = Math.round(B.y - 44); ctx.fillStyle = '#140c08'; ctx.fillRect(x - 1, y - 1, 52, 3); ctx.fillStyle = '#5ab0ff'; ctx.fillRect(x, y, Math.max(1, 50 * B.arm / B.armMax), 1); }});
  if (skOn() && eqW()) { const M = mineState(), v = (M.sk || 0) / 100; ctx.fillStyle = '#140c08'; ctx.fillRect(player.x - 8, player.y + 3, 16, 2); ctx.fillStyle = v >= 1 ? (Math.sin(tNow * 10) > 0 ? '#ffe070' : '#ff9a40') : '#c8a050'; ctx.fillRect(player.x - 8, player.y + 3, Math.round(16 * v), 2); }
  return out;
}
// ===== v0.40: 魔物牧場・使い魔・薬草と調合
const POTD = {}; (D.pot || []).forEach(([id, rc, d]) => POTD[id] = {rc, d});
const POT_IDS = Object.keys(POTD);
const HYB_N = {chimera:'キメラ', slimecrab:'スライムガニ', frostfox:'雪狐', goldboar:'黄金イノシシ', shadowbat:'影コウモリ', emberwolf:'炎狼', kasaslime:'傘スライム', starbird:'星の鳥'};
const HYB_PROD = {chimera:'msnake_meat', slimecrab:'kani_yoroi', frostfox:'kitsune_age', goldboar:'scarab_honey', shadowbat:'bat_wing', emberwolf:'iwolf_meat', kasaslime:'kasa_kinoko', starbird:'fbird_egg'};
const HYB_RULE = [['slimecrab', ['slime', 'slimei', 'slimed'], ['acrab']], ['frostfox', ['kitsune'], ['iwolf', 'icebeast', 'yuki']], ['goldboar', ['boar'], ['scarab']], ['shadowbat', ['bat'], ['shade']],
  ['emberwolf', ['iwolf'], ['lizard', 'fbird', 'mgolem']], ['kasaslime', ['kasa'], ['slime', 'slimei', 'slimed']], ['starbird', ['fbird'], ['darkbird']], ['chimera', ['msnake'], ['boar', 'goldboar', 'meibeast']]];
const EGG_POOL = {cave:['boar', 'bat'], crystal:['slime', 'bat'], fire:['lizard', 'slime'], ice:['icebeast', 'slimei'], dark:['darkbird', 'shade', 'slimed', 'meibeast'],
  ship:['skel', 'acrab', 'moray'], temple:['mummy', 'scorp', 'scarab'], shrine:['takeoni', 'kitsune', 'kasa'], castle:['iknight', 'yuki', 'iwolf'], volcano:['mgolem', 'fbird', 'msnake']};
const MR_FIRE = new Set(['lizard', 'fbird', 'mgolem', 'msnake', 'emberwolf', 'chimera']), MR_ICE = new Set(['icebeast', 'slimei', 'yuki', 'iwolf', 'iknight', 'frostfox']), MR_EARTH = new Set(['boar', 'takeoni', 'kasa', 'goldboar', 'scarab', 'acrab', 'mummy', 'scorp', 'skel', 'meibeast']);
const MR_JOB = {kitchen:['かまど番', '料理の値打ち+3%'], shop:['呼び込み', '客足+4%'], farm:['畑番', '農場の作物の育ち+6%']};
const MR_CAP = [6, 12, 18, 24], MR_UP = [0, 50000, 150000, 400000];
const mrName = k => (MONT[k] && MONT[k].n) || HYB_N[k] || k;
const mrCat = k => MR_FIRE.has(k) ? 'kitchen' : MR_EARTH.has(k) ? 'farm' : MR_ICE.has(k) ? 'shop' : (MONT[k] && MONT[k].fly) || k === 'shadowbat' || k === 'starbird' ? 'shop' : 'kitchen';
const mrProd = k => HYB_PROD[k] || (MPART[k] && MPART[k][0]) || (MONT[k] && MONT[k].drop[0] && MONT[k].drop[0][0]) || 'slime_jelly';
const MR_ALL = [...Object.keys(MONT).filter(k => !MONT[k].boss), ...Object.keys(HYB_N)];
function mrSt() { if (!S.mr) S.mr = {lv:1, mons:[], box:[], fam:null, inc:[null, null, null, null], plots:[null, null, null, null, null, null], feed:0, day:gday(), out:{}, seen:{}, made:{}, nPot:0, buf:{}, n:0};
  for (const k of ['out', 'seen', 'made', 'buf']) if (!S.mr[k]) S.mr[k] = {}; return S.mr; }
const mrCap = () => MR_CAP[mrSt().lv - 1], mrIncN = () => 2 + (mrSt().lv >= 3 ? 1 : 0) + (mrSt().lv >= 4 ? 1 : 0);
const mrAll = () => [...mrSt().mons, ...mrSt().box];
const mrById = id => mrAll().find(m => m.id === id);
const mrDay = k => S.mr && S.mr.buf[k] === gday();
function mrHelp(cat) { if (!S.mr || !unl('mranch')) return 1; const n = S.mr.mons.filter(m => m.job === cat).length; return 1 + n * ({kitchen:.03, shop:.04, farm:.06}[cat]); }
function mrShopMul() { return mrHelp('kitchen') * (mrDay('trade') ? 1.1 : 1); }
function mrAdd(k, sh, why) {
  const R = mrSt(), m = {id:++R.n, k, sh:!!sh, lv:1, xp:0, evo:0, hap:50, job:null};
  (R.mons.length < mrCap() ? R.mons : R.box).push(m); const first = !R.seen[k]; R.seen[k] = 1; if (sh) R.seen[k + '*'] = 1; dirty = true; sfx('ok'); tut('mr_new');
  popStory(`<div class="tth">${sh ? '✨ 色違いの' : '🐾 '}${mrName(k)}が仲間になった！</div><div class="ttx">${why}<br>${R.mons.includes(m) ? '魔物牧場に連れて帰った。' : '牧場がいっぱいなので、魔物の小屋（預かり）に入れた。'}${first ? '<br>（牧場の図鑑に登録）' : ''}</div>`);
  return m;
}
function mrTame(m) {
  if (!unl('mranch') || m.boss || m.elite || !MONT[m.k] || monStar(m.k) < 1) return;
  const M = mineState(), p = .005 * (M.charm ? 3 : 1) * (1 + .1 * (FL && FL.curse || 0)) * (isFullMoon() ? 2 : 1);
  const R = mrSt(); R.tp = (R.tp || 0) + p;   // v0.62 天井：確率の合計が0.3（ふつう約60体）でなつかなければ、次は必ず
  if (Math.random() < p || R.tp >= .3) { R.tp = 0; mrAdd(m.k, Math.random() < .02, `倒れた${MONT[m.k].n}が、起き上がってこちらを見つめている……なついたようだ。`); }
}
function eggKind(fl) { return fl.dg ? (fl.dg === 'mirror' || fl.dg === 'tower' ? 'dark' : fl.dg) : fl.v ? 'dark' : ['cave', 'crystal', 'fire', 'ice', 'dark', 'dark'][layerOf(fl.f)]; }
function mrEggDrop(fl, p) { if (!unl('mranch') || !fl || Math.random() > p) return; const id = ING.find(g => g.src[0] === 'mregg' && g.src[1] === eggKind(fl)).id; giveBag('i', id, false, 1); tripAdd(id, 1); S.known.i[id] = true; toast(`🥚 ${ingName(id)}を拾った！ 魔物牧場の孵化小屋で孵せる`, 3000); }
function mrDaily() {
  const R = mrSt(), d = gday(); if (R.day === d) return; const days = Math.min(3, d - R.day); R.day = d;
  for (let k = 0; k < days; k++) for (const m of R.mons) {
    if (R.feed > 0) { R.feed--; m.hap = Math.min(100, m.hap + 6); const n = 1 + (m.hap >= 80 ? 1 : 0) + (m.evo || 0); const id = mrProd(m.k); R.out[id] = (R.out[id] || 0) + n; }
    else m.hap = Math.max(0, m.hap - 10);
  }
}
// ---- 使い魔
const famXpNeed = lv => 10 + lv * 6;
const famAtk = m => Math.round((4 + m.lv * 1.6) * [1, 1.5, 2.2][m.evo || 0] * (m.sh ? 1.1 : 1));
let FAM = null;
function famOf() { const R = S.mr; if (!R || !unl('familiar') || !R.fam) return null; return mrById(R.fam) || null; }
function famTick(dt) {
  const m = famOf(); if (!m || !FL) { FAM = null; return; }
  if (!FAM || FAM.id !== m.id) FAM = {id:m.id, x:player.x - 10, y:player.y + 4, cd:1, flip:false};
  const F = FAM; F.cd -= dt;
  const t = FL.mons.filter(o => Math.hypot(o.x - player.x, o.y - player.y) < 60).sort((a, b) => Math.hypot(a.x - F.x, a.y - F.y) - Math.hypot(b.x - F.x, b.y - F.y))[0];
  let tx = player.x - 12, ty = player.y + 4; if (t) { tx = t.x + (F.x < t.x ? -10 : 10); ty = t.y; }
  const d = Math.hypot(tx - F.x, ty - F.y), sp = (t ? 70 : 60) * dt; if (d > 2) { F.x += (tx - F.x) / d * Math.min(d, sp); F.y += (ty - F.y) / d * Math.min(d, sp); F.flip = tx < F.x; }
  if (t && Math.hypot(t.x - F.x, t.y - F.y) < (t.boss ? 26 : 14) && F.cd <= 0) { F.cd = 1; F.flip = t.x < F.x; F.hit = .15; hitMon(t, famAtk(m) * (FL.dg || FL.curse ? 1 + .1 * dgRingN() : 1), {kb:2}, {}, false); }
  if (F.hit > 0) F.hit -= dt;
}
function famXp(n) {
  const m = famOf(); if (!m || m.lv >= 40) return; m.xp += n;
  while (m.lv < 40 && m.xp >= famXpNeed(m.lv)) { m.xp -= famXpNeed(m.lv); m.lv++; floatAt(FAM ? FAM.x : player.x, (FAM ? FAM.y : player.y) - 20, `${mrName(m.k)} Lv${m.lv}`, 'info');
    const ev = m.lv >= 30 ? 2 : m.lv >= 15 ? 1 : 0; if (ev > (m.evo || 0)) { m.evo = ev; sfx('ok'); popStory(`<div class="tth">🌟 ${mrName(m.k)}が進化した！</div><div class="ttx">${ev === 2 ? '王の冠をいただく、最上位の姿になった。攻撃×2.2・牧場の素材+2' : '金色の光をまとう、上位の姿になった。攻撃×1.5・牧場の素材+1'}</div>`); } }
  dirty = true;
}
function mrFilter(m) { return m && m.sh ? 'hue-rotate(150deg) saturate(1.4) brightness(1.1)' : 'none'; }
function drawMon(m, x, y, flip) {
  if (m.evo) { const c = m.evo === 2 ? '255,150,230' : '255,220,120'; for (let k = 0; k < 6; k++) { const a = tNow * 1.5 + k * 1.05; ctx.fillStyle = `rgba(${c},.9)`; ctx.fillRect(Math.round(x + Math.cos(a) * 9), Math.round(y - 7 + Math.sin(a) * 6), 1, 1); } }
  ctx.save(); ctx.filter = mrFilter(m); drawChar(m.k, x, y, flip); ctx.restore();
  if (m.evo === 2) { ctx.fillStyle = '#ffc840'; ctx.fillRect(x - 3, y - 19, 7, 2); ctx.fillRect(x - 3, y - 21, 1, 2); ctx.fillRect(x, y - 22, 1, 3); ctx.fillRect(x + 3, y - 21, 1, 2); }
}
function drawFam() { const m = famOf(); if (!m || !FAM) return []; return [{y:FAM.y, f:() => drawMon(m, Math.round(FAM.x), Math.round(FAM.y + (MONT[m.k] && MONT[m.k].fly ? Math.sin(tNow * 8) * 2 : 0) - (FAM.hit > 0 ? 2 : 0)), FAM.flip)}]; }
// ---- 薬
function potLuck() { return (buffOn('p_luck') ? 1.5 : 1) * (buffOn('p_luck2') ? 2 : 1); }
function potFx(out) { const ad = (b, k) => { if (buffOn(b)) out[k] = (out[k] || 0) + 1; }; ad('p_burn', 'burn'); ad('p_chill', 'chill'); ad('p_poison', 'poison'); ad('p_drain', 'drain'); ad('p_crit', 'crit2'); ad('p_speed', 'swift'); ad('p_speed', 'spd'); }
const POT_MINE = new Set(['p_heal', 'p_heal2', 'p_heal3', 'p_stam', 'p_stam2', 'p_cure', 'p_elixir', 'p_atk', 'p_atk2', 'p_def', 'p_def2', 'p_speed', 'p_crit', 'p_luck', 'p_luck2', 'p_mine', 'p_burn', 'p_chill', 'p_poison', 'p_drain', 'p_regen', 'p_night', 'p_anti', 'p_stealth', 'p_charm']);
const POT_DUR = {p_atk:300, p_atk2:600, p_def:300, p_def2:600, p_speed:300, p_crit:300, p_luck:600, p_luck2:1200, p_burn:600, p_chill:600, p_poison:600, p_drain:600, p_regen:600, p_night:600, p_anti:600, p_stealth:600};
function potUse(id) {
  const M = mineState(), R = mrSt(), inMine = scene === 'mine' && FL;
  if (POT_MINE.has(id) && !inMine) return toast('この薬は迷宮・ダンジョンの中で使う');
  if (!haveIng(id)) return;
  if (id === 'p_hatch') { const s = R.inc.findIndex(x => x); if (s < 0) return toast('孵化小屋に卵がない'); R.inc.forEach(x => { if (x) x.t0 = -1e9; }); }
  else if (id === 'p_grow') { const m = famOf() || R.mons[0]; if (!m) return toast('使い魔がいない'); if (m.lv >= 40) return toast('もう最高のレベル'); const keep = R.fam; R.fam = m.id; famXp(famXpNeed(m.lv) - m.xp); R.fam = keep; }
  else if (id === 'p_harvest') { R.plots.forEach(p => { if (p) p.t0 = -1e9; }); S.plots.forEach(p => { if (p.seed) p.g = Math.max(p.g || 0, ING[INGI[p.seed]].src[2]); }); }
  else if (id === 'p_trade') R.buf.trade = gday(); else if (id === 'p_fish') R.buf.fish = gday();
  else {
    if (id === 'p_heal') M.hp = Math.min(M.hpMax, M.hp + 60); if (id === 'p_heal2') M.hp = Math.min(M.hpMax, M.hp + 150); if (id === 'p_heal3') M.hp = M.hpMax;
    if (id === 'p_stam') M.st = Math.min(M.stMax, M.st + 60); if (id === 'p_stam2') M.st = M.stMax; if (id === 'p_cure' || id === 'p_elixir') { M.hp = M.hpMax; M.st = M.stMax; }
    if (id === 'p_elixir') M.revive = 1; if (id === 'p_charm') M.charm = 1; if (id === 'p_mine') M.buff.mine = S.t + 600;
    if (POT_DUR[id]) M.buff[id] = S.t + POT_DUR[id] * buffDurMul();
  }
  takeIng(id, false, 1); sfx('ok'); toast(`🧪 ${ingName(id)}：${POTD[id].d}`, 2500); dirty = true; return true;
}
function openPotUse() {
  const ids = POT_IDS.filter(id => haveIng(id)), inMine = scene === 'mine' && FL;
  modal('薬を使う', (ids.map(id => { const ok = inMine ? POT_MINE.has(id) : !POT_MINE.has(id);
    return `<div class="row">${ingIc(id, U * 9)}<div class="t"><b>${ingName(id)} ×${haveIng(id)}</b><span>${POTD[id].d}</span></div><div class="btn ${ok ? 'grn' : 'dis'}" data-pu="${id}">使う</div></div>`; }).join('') || '<div class="p">薬を持っていない。魔物牧場の調合小屋で作れる。</div>'), 'potuse');
  bind('[data-pu]', d => { if (potUse(d.pu)) openPotUse(); });
}
// ---- 調合小屋
let alcTab = 'make';
function openAlchemy() {
  if (!unl('herb')) return gateMsg('herb'); tut('alchemy'); const R = mrSt();
  const need = id => Object.entries(POTD[id].rc), can = (id, n = 1) => need(id).every(([k, c]) => haveIng(k) >= c * n);
  const tabs = `<div class="seg"><div class="${alcTab === 'make' ? 'on' : ''}" data-at="make">調合 ${Object.keys(R.made).length}/${POT_IDS.length}</div><div class="${alcTab === 'use' ? 'on' : ''}" data-at="use">牧場や店で使う</div><div class="${alcTab === 'sell' ? 'on' : ''}" data-at="sell">薬問屋に卸す</div></div>`;
  let body = '';
  if (alcTab === 'make') body = `<div class="p">薬草と素材を混ぜて薬を作る。迷宮では画面上の「🧪薬」から使う。</div>` + POT_IDS.map(id => `<div class="row">${ingIc(id, U * 9, false, true)}<div class="t"><b>${ingName(id)}${R.made[id] ? '' : '　<i style="font-style:normal;color:#e8c050">NEW</i>'}　持っている${haveIng(id)}</b><span>${POTD[id].d}<br>${need(id).map(([k, c]) => `<i style="font-style:normal;color:${haveIng(k) >= c ? '#c8e0a8' : '#d8806a'}">${S.known.i[k] || HERB_IDS.includes(k) ? ingName(k) : '？？？'}×${c}</i>`).join('・')}</span></div><div style="display:flex;flex-direction:column;gap:2px"><div class="btn ${can(id) ? 'grn' : 'dis'}" data-mk="${id}:1">作る</div><div class="btn ${can(id, 5) ? '' : 'dis'}" data-mk="${id}:5">×5</div></div></div>`).join('');
  else if (alcTab === 'use') return openPotUse();
  else body = `<div class="p">高い薬ほど高く買い取ってくれる（値打ちの1倍）。</div>` + POT_IDS.filter(id => haveIng(id)).map(id => `<div class="row">${ingIc(id, U * 9)}<div class="t"><b>${ingName(id)} ×${haveIng(id)}</b><span>1本 ${fmt(ING[INGI[id]].value)}G</span></div><div class="btn" data-sl="${id}:1">1本</div><div class="btn" data-sl="${id}:all">全部</div></div>`).join('') || '<div class="p">売れる薬を持っていない。</div>';
  modal('調合小屋', tabs + body, 'alc');
  bind('[data-at]', d => { alcTab = d.at; openAlchemy(); });
  bind('[data-mk]', d => { const [id, n_] = d.mk.split(':'), n = +n_; if (!can(id, n)) return; for (const [k, c] of need(id)) takeIng(k, false, c * n); add(S.inv, id, n); S.known.i[id] = true; const first = !R.made[id]; R.made[id] = 1; R.nPot = (R.nPot || 0) + n; sfx('cook'); toast(`🧪 ${ingName(id)}を${n}本作った！${first ? '（初めての調合）' : ''}`); openAlchemy(); });
  bind('[data-sl]', d => { const [id, n_] = d.sl.split(':'), n = n_ === 'all' ? haveIng(id) : 1; if (!n) return; takeIng(id, false, n); const g = ING[INGI[id]].value * n; S.gold += g; S.stat.earned = (S.stat.earned || 0) + g; sfx('coin'); toast(`+${fmt(g)}G`); openAlchemy(); });
}
// ---- 薬草畑
const HERB_IDS = ING.filter(g => g.src[0] === 'herb').map(g => g.id);
const herbSeed = id => ING[INGI[id]].value * 2;
function openHerbPlot(i) {
  if (!unl('herb')) return gateMsg('herb'); tut('herb'); const R = mrSt(), p = R.plots[i];
  if (p) { const g = ING[INGI[p.h]], left = g.src[1] - (S.t - p.t0);
    if (left <= 0) { const n = 3 + (Math.random() < .3 * accMul('luck') ? 1 : 0); giveBag('i', p.h, false, n); S.known.i[p.h] = true; R.plots[i] = null; sfx('ok'); toast(`${g.name}を${n}つ摘んだ`); dirty = true; return; }
    return toast(`${g.name}：あと${fmtLeft(left)}で摘める`); }
  modal('薬草畑', `<div class="p">苗を植えると、ゲームの時間で育つ（眠っている間も）。1区画で3つ摘める。</div>` + HERB_IDS.map(id => { const g = ING[INGI[id]];
    return `<div class="row">${ingIc(id, U * 9, false, true)}<div class="t"><b>${g.name}</b><span>${fmtLeft(g.src[1])}で育つ　${ING[INGI[id]].desc || ''}</span></div><div class="btn ${S.gold >= herbSeed(id) ? 'grn' : 'dis'}" data-hp="${id}">苗 ${fmt(herbSeed(id))}G</div></div>`; }).join(''), 'herbp');
  bind('[data-hp]', d => { if (S.gold < herbSeed(d.hp)) return; S.gold -= herbSeed(d.hp); R.plots[i] = {h:d.hp, t0:S.t}; sfx('ok'); closeModal(); dirty = true; });
}

// ---- 孵化小屋・掛け合わせ
function hatchResult(slot) {
  if (slot.par) { const [a, b] = slot.par, r = HYB_RULE.find(([h, x, y]) => (x.includes(a) && y.includes(b)) || (x.includes(b) && y.includes(a)));
    if (r && Math.random() < .7) return r[0]; return Math.random() < .5 ? a : b; }
  const g = ING[INGI[slot.egg]]; return pick(EGG_POOL[g.src[1]] || EGG_POOL.cave);
}
function openIncubator() {
  if (!unl('mranch')) return gateMsg('mranch'); tut('mranch'); const R = mrSt(), N = mrIncN();
  const eggs = ING.filter(g => g.src[0] === 'mregg' && g.id !== 'egg_mix' && haveIng(g.id));
  const slots = R.inc.slice(0, N).map((x, i) => { if (!x) return `<div class="row"><div class="calev">🪹</div><div class="t"><b>あいている</b><span>${eggs.length ? '下の卵を選んで入れる' : '迷宮やダンジョンで卵を拾おう'}</span></div></div>`;
    const left = 1440 - (S.t - x.t0); return `<div class="row">${ingIc(x.egg, U * 9, false, true)}<div class="t"><b>${ingName(x.egg)}</b><span>${x.par ? `${mrName(x.par[0])}×${mrName(x.par[1])}の卵　` : ''}${left > 0 ? 'あと' + fmtLeft(left) : '<b style="color:#8ad86a">もうすぐ生まれる！</b>'}</span></div>${left <= 0 ? `<div class="btn grn" data-ht="${i}">孵す</div>` : ''}</div>`; }).join('');
  modal('孵化小屋', `<div class="p">卵を温めると、1日で魔物が生まれる。まれに<b>色違い</b>（3%、掛け合わせの卵は6%）。<br>孵化の場所 ${N}つ（牧場を強化すると増える）。</div>${slots}
    <div class="h">持っている卵</div>${eggs.map(g => `<div class="row">${ingIc(g.id, U * 9, false, true)}<div class="t"><b>${g.name} ×${haveIng(g.id)}</b><span>生まれるかも：${(EGG_POOL[g.src[1]] || []).map(mrName).join('・')}</span></div><div class="btn ${R.inc.slice(0, N).some(x => !x) ? '' : 'dis'}" data-pe="${g.id}">温める</div></div>`).join('') || '<div class="p">卵を持っていない。</div>'}`, 'incub');
  bind('[data-pe]', d => { const s = R.inc.slice(0, N).findIndex(x => !x); if (s < 0 || !haveIng(d.pe)) return; takeIng(d.pe, false, 1); R.inc[s] = {egg:d.pe, t0:S.t}; sfx('ok'); dirty = true; openIncubator(); });
  bind('[data-ht]', d => { const x = R.inc[+d.ht]; if (!x) return; const k = hatchResult(x); R.inc[+d.ht] = null; closeModal(); mrAdd(k, Math.random() < (x.par ? .06 : .03), `${ingName(x.egg)}にひびが入り……${mrName(k)}が生まれた！`); });
}
function openBreed(sel) {
  if (!unl('mbreed')) return gateMsg('mbreed'); tut('mbreed'); const R = mrSt(), N = mrIncN(); sel = sel || [];
  const ok = m => m.lv >= 5 && m.bd !== gday();
  const rows = R.mons.map(m => `<div class="row" style="${sel.includes(m.id) ? 'background:#3a2a3a' : ''}"><div style="width:${U * 10}px">${mrIcHTML(m, U * 9)}</div><div class="t"><b>${m.sh ? '✨' : ''}${mrName(m.k)} Lv${m.lv}</b><span>${ok(m) ? '' : m.lv < 5 ? 'Lv5から掛け合わせられる' : '今日はもう掛け合わせた'}</span></div><div class="btn ${ok(m) ? (sel.includes(m.id) ? 'grn' : '') : 'dis'}" data-bs="${m.id}">${sel.includes(m.id) ? '選択中' : '選ぶ'}</div></div>`).join('');
  const [a, b] = sel.map(mrById), hint = a && b ? (HYB_RULE.find(([h, x, y]) => (x.includes(a.k) && y.includes(b.k)) || (x.includes(b.k) && y.includes(a.k))) ? '<b style="color:#ffb0d8">何か特別な魔物が生まれそうな気配……</b>' : 'どちらかの子が生まれそう') : '';
  modal('掛け合わせの石舞台', `<div class="p">Lv5以上の2体を石舞台にのせると、<b>掛け合わせの卵</b>が孵化小屋に入る（5,000G、1体1日1回）。組み合わせによっては<b>新しい種類</b>が生まれ、色違いも出やすい（6%）。</div>
    <div class="p">見つけた新種 ${Object.keys(HYB_N).filter(k => R.seen[k]).length}/${Object.keys(HYB_N).length}　${hint}</div>${rows}
    <div class="btn big ${a && b && S.gold >= 5000 && R.inc.slice(0, N).some(x => !x) ? 'grn' : 'dis'}" data-a="mix">掛け合わせる</div>`, 'breed');
  bind('[data-bs]', d => { const id = +d.bs, m = mrById(id); if (!ok(m)) return; let s = sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]; if (s.length > 2) s = s.slice(1); openBreed(s); });
  bind('[data-a=mix]', () => { const s = R.inc.slice(0, N).findIndex(x => !x); if (!(a && b) || S.gold < 5000 || s < 0) return; S.gold -= 5000; a.bd = b.bd = gday(); R.inc[s] = {egg:'egg_mix', t0:S.t, par:[a.k, b.k]}; S.known.i.egg_mix = true; sfx('ok'); toast('石舞台が光った！ 掛け合わせの卵が孵化小屋に入った'); dirty = true; openBreed(); });
}
function mrIcHTML(m, px) { return `<div style="filter:${mrFilter(m)}">${charHTML(m.k, px)}</div>`; }
// ---- 牧場の画面
let mrTab = 'pen';
function openRanch() {
  if (!unl('mranch')) return gateMsg('mranch'); tut('mranch'); mrDaily(); const R = mrSt();
  const outN = Object.values(R.out).reduce((a, b) => a + b, 0);
  const tabs = `<div class="seg"><div class="${mrTab === 'pen' ? 'on' : ''}" data-mt="pen">牧場 ${R.mons.length}/${mrCap()}</div><div class="${mrTab === 'box' ? 'on' : ''}" data-mt="box">小屋 ${R.box.length}</div><div class="${mrTab === 'dex' ? 'on' : ''}" data-mt="dex">図鑑</div></div>`;
  const monRow = (m, inBox) => `<div class="row"><div style="width:${U * 10}px">${mrIcHTML(m, U * 9)}</div><div class="t"><b>${m.sh ? '✨' : ''}${mrName(m.k)} Lv${m.lv}${['', '・上位', '・王'][m.evo || 0]}${R.fam === m.id ? '　<i style="font-style:normal;color:#e8c050">使い魔</i>' : ''}</b><span>なつき ${'♥'.repeat(Math.round(m.hap / 20))}${'♡'.repeat(5 - Math.round(m.hap / 20))}　素材：${ingName(mrProd(m.k))}${m.job ? `　手伝い：${MR_JOB[m.job][0]}` : ''}<br>攻撃${famAtk(m)}　経験 ${m.xp}/${famXpNeed(m.lv)}</span></div><div class="btn" data-mm="${m.id}">${inBox ? '出す' : '見る'}</div></div>`;
  let body = '';
  if (mrTab === 'pen') {
    body = (unl('expd') ? `<div class="btn big blu" data-a="sq" style="margin-bottom:calc(var(--u)*1.4)">🧭 遠征隊（${(S.sq ? S.sq.t.length : 0)}/${SQ_TEAMS}隊が出発中）</div>` : '') + `<div class="p">毎朝、えさを1つ食べた魔物が素材を生む（なつき♥4以上で+1、進化で+1）。えさがないと元気がなくなる。</div>
      <div class="row"><div class="calev">🌾</div><div class="t"><b>えさ箱 ${R.feed}</b><span>作物・採集物を入れる（1つ＝1体の1日分）</span></div><div class="btn" data-a="feed">入れる</div></div>
      <div class="row"><div class="calev">🧺</div><div class="t"><b>とれた素材 ${outN}個</b><span>${Object.entries(R.out).map(([k, n]) => `${ingName(k)}×${n}`).join('・') || 'なし'}</span></div><div class="btn ${outN ? 'grn' : 'dis'}" data-a="take">受け取る</div></div>
      ${R.mons.map(m => monRow(m)).join('') || '<div class="p">まだ魔物がいない。図鑑★1以上の魔物は、倒したときにまれになつく。卵を拾って孵化小屋で孵すこともできる。</div>'}
      <div class="h">牧場の強化 Lv${R.lv}</div><div class="p">飼える数 ${mrCap()}・孵化の場所 ${mrIncN()}</div>${R.lv < 4 ? `<div class="btn big ${S.gold >= MR_UP[R.lv] ? 'grn' : 'dis'}" data-a="up">強化（${fmt(MR_UP[R.lv])}G）→ 飼える数 ${MR_CAP[R.lv]}</div>` : ''}`;
  } else if (mrTab === 'box') body = `<div class="p">牧場に入りきらない魔物はここで預かる（素材は生まない）。</div>` + (R.box.map(m => monRow(m, true)).join('') || '<div class="p">預かっている魔物はいない。</div>');
  else { const n = MR_ALL.filter(k => R.seen[k]).length, ns = MR_ALL.filter(k => R.seen[k + '*']).length;
    body = `<div class="p">仲間にした種類 ${n}/${MR_ALL.length}　色違い ${ns}/${MR_ALL.length}</div><div style="display:flex;flex-wrap:wrap;gap:2px">` + MR_ALL.map(k => `<div style="width:${U * 13}px;text-align:center;font-size:${U * 3.3}px;${R.seen[k] ? '' : 'opacity:.4'}"><div style="${R.seen[k] ? '' : 'filter:brightness(0)'}">${charHTML(k, U * 9)}</div>${R.seen[k] ? mrName(k) : '？？？'}${R.seen[k + '*'] ? '✨' : ''}</div>`).join('') + '</div>'; }
  modal('魔物牧場', tabs + body, 'mranch');
  bind('[data-mt]', d => { mrTab = d.mt; openRanch(); });
  bind('[data-mm]', d => openMrMon(+d.mm));
  bind('[data-a=feed]', () => { const ids = ING.filter(g => ['seed', 'forage', 'tree'].includes(g.src[0]) && haveIng(g.id) && g.value <= 60).sort((a, b) => a.value - b.value); let need = Math.max(R.mons.length * 3, 10), got = 0;
    for (const g of ids) { const n = Math.min(need - got, haveIng(g.id)); if (n <= 0) break; takeIng(g.id, false, n); got += n; } if (!got) return toast('えさになる作物・採集物（値打ち60G以下）がない'); R.feed += got; sfx('ok'); toast(`えさ箱に${got}個入れた`); openRanch(); });
  bind('[data-a=take]', () => { for (const [k, n] of Object.entries(R.out)) { giveBag('i', k, false, n); S.known.i[k] = true; } R.out = {}; sfx('ok'); openRanch(); });
  bind('[data-a=sq]', () => openSquad());
  bind('[data-a=up]', () => { if (R.lv >= 4 || S.gold < MR_UP[R.lv]) return; S.gold -= MR_UP[R.lv]; R.lv++; while (R.box.length && R.mons.length < mrCap()) R.mons.push(R.box.shift()); sfx('ok'); openRanch(); });
}
function openMrMon(id) {
  const R = mrSt(), m = mrById(id); if (!m) return openRanch(); const inBox = R.box.includes(m), cat = mrCat(m.k), helpers = R.mons.filter(x => x.job).length;
  modal(mrName(m.k), `<div style="text-align:center">${mrIcHTML(m, U * 20)}</div><div class="p">${m.sh ? '✨色違い　' : ''}Lv${m.lv}${['', '（上位）', '（王）'][m.evo || 0]}　攻撃${famAtk(m)}　なつき${m.hap}<br>Lv15で上位、Lv30で王に進化する。毎朝の素材：${ingName(mrProd(m.k))}</div>
    ${unl('familiar') ? `<div class="btn big ${R.fam === m.id ? 'grn' : ''}" data-a="fam">${R.fam === m.id ? '使い魔にしている（外す）' : '使い魔にする（迷宮・ダンジョンへ連れて行く）'}</div>` : ''}
    ${!inBox ? `<div class="btn big ${m.job ? 'grn' : helpers >= 3 ? 'dis' : ''}" data-a="job" style="margin-top:3px">${m.job ? `手伝い中：${MR_JOB[m.job][0]}（${MR_JOB[m.job][1]}）→やめる` : `店や畑を手伝わせる：${MR_JOB[cat][0]}（${MR_JOB[cat][1]}）　${helpers}/3`}</div>` : ''}
    <div class="btn" data-a="mv" style="margin-top:3px">${inBox ? '牧場に出す' : '小屋に預ける'}</div><div class="btn red" data-a="rel" style="margin-top:3px">野に帰す</div><div class="btn" data-a="back" style="margin-top:3px">もどる</div>`, 'mrmon');
  bind('[data-a=fam]', () => { if (R.fam !== m.id && sqBusy('m:' + m.id)) return toast('遠征中の魔物は使い魔にできない'); R.fam = R.fam === m.id ? null : m.id; tut('familiar'); FAM = null; openMrMon(id); });
  bind('[data-a=job]', () => { if (m.job) m.job = null; else if (helpers < 3) m.job = cat; dirty = true; openMrMon(id); });
  bind('[data-a=mv]', () => { if (inBox) { if (R.mons.length >= mrCap()) return toast('牧場がいっぱい'); R.box = R.box.filter(x => x !== m); R.mons.push(m); } else { R.mons = R.mons.filter(x => x !== m); m.job = null; R.box.push(m); } openMrMon(id); });
  bind('[data-a=rel]', (d_, el) => { if (el.dataset.c !== '1') { el.dataset.c = '1'; el.textContent = 'もう一度押すと野に帰す'; return; } R.mons = R.mons.filter(x => x !== m); R.box = R.box.filter(x => x !== m); if (R.fam === m.id) R.fam = null; toast(`${mrName(m.k)}は野に帰っていった`); openRanch(); });
  bind('[data-a=back]', () => openRanch());
}
// ---- 牧場の場面
const MRW = {};
function drawMRanch() {
  const R = S.mr, out = []; if (!R) return out;
  if (unl('herb')) R.plots.forEach((p, i) => { if (!p) return; const [x, y] = [[7, 48], [34, 48], [7, 70], [34, 70], [7, 92], [34, 92]][i], g = ING[INGI[p.h]], k = Math.min(1, (S.t - p.t0) / g.src[1]);
    out.push({y:y + 14, f:() => { for (let j = 0; j < 4; j++) { const xx = x + 3 + j * 6, yy = y + 10; if (k >= 1) drawIcon(g.icon, xx - 2, yy - 6, 8); else { ctx.fillStyle = '#4a8a3a'; ctx.fillRect(xx, yy - Math.round(k * 4), 2, 1 + Math.round(k * 4)); ctx.fillStyle = '#6ab84a'; ctx.fillRect(xx - 1, yy - Math.round(k * 4) - 1, 4, 1); } }
      if (k >= 1 && Math.sin(tNow * 4 + i) > .6) { ctx.fillStyle = '#fff8c0'; ctx.fillRect(x + 24, y + 2, 1, 1); } }}); });
  R.mons.forEach((m, i) => { if (S.sq && sqBusy('m:' + m.id)) return; let w = MRW[m.id]; const left = i % 2 === 0;
    if (!w) w = MRW[m.id] = {x:left ? rnd(14, 54) : rnd(90, 130), y:rnd(140, 228), tx:0, ty:0, t:0, left};
    out.push({y:w.y, f:() => drawMon(m, Math.round(w.x), Math.round(w.y), w.flip)}); });
  for (let k = 0; k < (R.inc || []).length; k++) if (R.inc[k] && 1440 - (S.t - R.inc[k].t0) <= 0 && Math.sin(tNow * 5) > 0) out.push({y:999, f:() => { ctx.fillStyle = '#fff0a0'; ctx.fillRect(40, 270, 2, 2); }});
  return out;
}
function mrWander(dt) {
  if (scene !== 'mranch' || !S.mr) return;
  for (const m of S.mr.mons) { const w = MRW[m.id]; if (!w) continue; w.t -= dt;
    if (w.t <= 0) { w.t = rnd(1.5, 4); w.tx = w.left ? rnd(14, 54) : rnd(90, 130); w.ty = rnd(140, 228); }
    const d = Math.hypot(w.tx - w.x, w.ty - w.y); if (d > 1) { const sp = 10 * dt; w.x += (w.tx - w.x) / d * Math.min(d, sp); w.y += (w.ty - w.y) / d * Math.min(d, sp); w.flip = w.tx < w.x; } }
}
SCENES.mranch = {name:'魔物牧場と薬草園', short:'牧場', objs:[
  ...[[7, 48], [34, 48], [7, 70], [34, 70], [7, 92], [34, 92]].map(([x, y], i) => ({id:'hplot' + i, lb:'薬草畑', r:[x, y, x + 26, y + 16], st:[x + 13 < 40 ? 30 : 56, 118], cond:() => unl('herb'), act:() => openHerbPlot(i)})),
  {id:'alc', lb:'調合小屋', r:[80, 44, 140, 94], st:[107, 102], cond:() => unl('herb'), act:() => openAlchemy()},
  {id:'penL', lb:'魔物牧場（えさ・素材・魔物）', r:[8, 130, 60, 234], st:[68, 180], act:() => openRanch()},
  {id:'penR', lb:'魔物牧場（えさ・素材・魔物）', r:[84, 130, 136, 234], st:[76, 180], act:() => openRanch()},
  {id:'incub', lb:'孵化小屋', r:[6, 244, 52, 288], st:[34, 294], act:() => openIncubator()},
  {id:'altar', lb:'掛け合わせの石舞台', r:[90, 260, 134, 298], st:[88, 292], cond:() => unl('mbreed'), act:() => openBreed()},
  {id:'mrexit', lb:'店の外の広場へ', r:[56, 300, 88, 320], st:[72, 310], act:() => go('outside', 110, 266)},
]};
WALKDEF.mranch = {areas:[[62, 94, 82, 318], [84, 98, 142, 124], [2, 114, 62, 124], [2, 288, 142, 300], [54, 236, 90, 300]], blocks:[]};

// ===== v0.41: 冒険の仲間・宝の地図・迷宮の隠し部屋・5つの町の石碑と古の厨房・満月の夜
const CP_KEYS = ['grant', 'sera', 'mia', 'crow'];
const CPD = {
  grant:{n:'グラント', role:'盾役', fav:['meat', 'grilled', 'stew'], favT:'肉の料理・煮込み', q:'奈落の深層B60より深い階に現れる「試練の魔物」（金のオーラ）を倒してくれ', skill:h => `受けるダメージ-${20 + 3 * h}%${h >= 2 ? '・近くの魔物を盾で殴る' : ''}`,
    intro:'「おう、お前さんが噂のSランクか。俺はグラント、盾ひとつで生きてきた。……ひとつ頼みがある。深層に、俺の昔の仲間を倒した魔物がいる。そいつを倒せたら、お前さんの盾になってやろう」',
    join:'「見事だ。あいつらも浮かばれる。今日から俺はお前さんの盾だ。腹が減ったら肉を頼むぜ」',
    st:['「盾の手入れか？ ……実は、この盾は死んだ相棒の形見なんだ。重いのは鉄のせいだけじゃねえ」', '「お前さんの店の煮込みを食うと、昔の野営を思い出す。焚き火を囲んで、相棒が下手くそな歌を歌ってな」',
      '「騎士団を追われたのは、命令より仲間を選んだからだ。後悔はしてねえ。……いや、少しはしてるか。上官の顔に一発入れたことはな」', '「なあ、店じまいの後に一杯どうだ。今日はおごるぜ。……財布？ 忘れた」',
      '「俺はもう誰も置いていかねえ。お前さんも、店も、あの小さい使い魔もだ。約束する」']},
  sera:{n:'セラ', role:'回復役', fav:['soup', 'pudding', 'tart', 'pie', 'cake'], favT:'スープ・甘い菓子', q:'施療院の薬が足りません。上級回復薬5本・万能薬3本・特級回復薬1本を届けてください',
    skill:h => `3秒ごとに体力を${(2 + .5 * h).toFixed(1)}%回復${h >= 5 ? '・1回だけ倒れても立ち上がらせる' : ''}`,
    intro:'「はじめまして、施療院のセラと申します。……近ごろ、迷宮から戻る冒険者のけがが増えていて、お薬が足りないのです。もし調合ができるなら、力を貸していただけませんか？」',
    join:'「ありがとうございます。これで皆さんを助けられます。……今度は、あなたを守らせてください。わたし、こう見えて迷宮は慣れていますので」',
    st:['「甘いものを食べると、祈りの声が少し明るくなる気がするんです。……ここだけの話ですよ？」', '「施療院の子どもたちに、あなたのスープを持っていったら大喜びで。みんな、いつかお店に行きたいって」',
      '「わたし、昔はとても怖がりで、血を見るだけで倒れていたんです。今は……ええ、倒れるのは三回に一回くらいです」', '「グラントさんの古いけが、まだ痛むみたいで。……ないしょで湿布を替えてあげているんです」',
      '「あなたが倒れても、わたしが必ず立たせます。だから、どうか無理だけはしないでくださいね」']},
  mia:{n:'ミア', role:'弓使い', fav:['salad', 'fruit', 'pancake', 'toast', 'pudding'], favT:'果物・サラダ・パンケーキ', q:'どこかの町の専用ダンジョンのボスを、呪い3以上で倒して見せて！',
    skill:h => `遠くの魔物を矢で射る（武器の攻撃の${50 + 8 * h}%）${h >= 3 ? '・会心が出やすい' : ''}`,
    intro:'「あんたがうわさのSランク？ ふーん……。あたしはミア、弓なら誰にも負けない。仲間になってほしいなら、呪いをかけたダンジョンのボスを倒すとこ、見せてよね！」',
    join:'「……すごいじゃん。いいよ、仲間になってあげる！ あ、報酬はおいしいパンケーキでいいから！」',
    st:['「森で育ったから、木の実の見分けは得意なんだ。毒きのこ？ ……三回くらい食べたかな」', '「グラントのおっさん、いびきがうるさいの。野営のときは一番遠くで寝ることにしてる」',
      '「本当は、矢を作るのも好き。羽の向きひとつで、まっすぐ飛ぶかどうかが変わるんだよ」', '「あんたの店の果物の料理、森のおばあちゃんの味に似てる。……べ、別に泣いてないし！」',
      '「あたしの矢は、あんたの前の敵には絶対に外れない。そういうおまじないをかけといたから」']},
  crow:{n:'クロウ', role:'盗賊', fav:['sashimi', 'sushi', 'sliced', 'fried'], favT:'魚の料理・揚げ物', q:'宝の地図の宝を3つ掘り当てて、迷宮の隠し部屋を2つ見つけてこい。腕を見たい',
    skill:h => `落とし物+${30 + 5 * h}%・隠し部屋が見つかりやすい${h >= 4 ? '・宝箱のお金2倍' : ''}`,
    intro:'「……あんたか。俺はクロウ。盗賊だが、店から物を盗んだことはない。……たぶんな。俺と組みたいなら、宝を探す腕を見せてもらおう」',
    join:'「悪くない鼻だ。いいだろう、組んでやる。分け前は魚の料理でいい。……揚げたやつな」',
    st:['「鍵開けのこつか？ 鍵の気持ちになることだ。……冗談だ。半分はな」', '「昔、この町の領主の屋敷に忍びこんだことがある。盗ったのは台所のパイだけだ。うまかった」',
      '「セラには内緒にしてくれ。施療院の寄付箱に金を入れているのは俺だ」', '「マルタという料理人を知っているか？ 子どものころ、腹をすかせていた俺に、黙って皿を出してくれた人だ」',
      '「……あんたの店は、あの人の店に似ている。だから俺はここにいる。それだけだ」']},
};
function cpSt() { if (!S.cp) S.cp = {j:{}, q:null, act:null, hp:{}, fed:{}, lv:{}}; return S.cp; }
const cpLv = k => Math.min(5, Math.floor(((S.cp && S.cp.hp[k]) || 0) / 20));
const cpAct = () => (S.cp && unl('comp') && S.cp.act && S.cp.j[S.cp.act] && !(S.sq && sqBusy('c:' + S.cp.act))) ? S.cp.act : null;
const cpNext = () => CP_KEYS.find(k => !cpSt().j[k]);
function cpPortrait(k, px) { const i = CP_KEYS.indexOf(k); return `<div style="flex:none;width:${px}px;height:${px}px;background:url(${IMG.cportraits.src}) -${i * px}px 0/${px * 4}px ${px}px;image-rendering:pixelated;border-radius:4px"></div>`; }
function cpSay(k, txt) { return `<div style="display:flex;gap:${U * 1.5}px;align-items:flex-start">${cpPortrait(k, U * 22)}<div class="p" style="flex:1"><b>${CPD[k].n}</b>（${CPD[k].role}）<br>${txt}</div></div>`; }
function cpQDone() {
  const C_ = cpSt(), q = C_.q; if (!q) return false;
  if (q.k === 'sera') return haveIng('p_heal2') >= 5 && haveIng('p_cure') >= 3 && haveIng('p_heal3') >= 1;
  if (q.k === 'crow') return (q.tm || 0) >= 3 && (q.vt || 0) >= 2;
  return !!q.done;
}
function cpQProg() { const q = cpSt().q; if (!q) return '';
  if (q.k === 'sera') return `上級回復薬 ${haveIng('p_heal2')}/5・万能薬 ${haveIng('p_cure')}/3・特級回復薬 ${haveIng('p_heal3')}/1`;
  if (q.k === 'crow') return `宝の地図の宝 ${q.tm || 0}/3・隠し部屋 ${q.vt || 0}/2`; return q.done ? '達成！' : 'まだ'; }
function openCpNew() {
  const k = cpNext(); if (!k) return openComps(); const C_ = cpSt(), D_ = CPD[k]; tut('comp');
  if (!C_.q || C_.q.k !== k) { modal('冒険者', cpSay(k, D_.intro) + `<div class="h">依頼</div><div class="p">${D_.q}</div><div class="btn big grn" data-a="acc">引き受ける</div>`, 'cpnew');
    return bind('[data-a=acc]', () => { C_.q = {k}; sfx('ok'); toast(`${D_.n}の依頼を引き受けた`); openCpNew(); }); }
  const ok = cpQDone();
  modal(D_.n, cpSay(k, ok ? '「……やったな。話を聞かせてくれ」' : '「どうだ、進んでいるか？」') + `<div class="h">依頼</div><div class="p">${D_.q}<br>進み具合：${cpQProg()}</div>${ok ? '<div class="btn big grn" data-a="done">報告する</div>' : ''}${Object.keys(C_.j).length ? '<div class="btn" data-a="all" style="margin-top:3px">仲間たちと話す</div>' : ''}`, 'cpnew');
  bind('[data-a=done]', () => { if (!cpQDone()) return; if (k === 'sera') { takeIng('p_heal2', false, 5); takeIng('p_cure', false, 3); takeIng('p_heal3', false, 1); }
    C_.j[k] = 1; C_.q = null; if (!C_.act) C_.act = k; C_.hp[k] = C_.hp[k] || 0; sfx('ok'); dirty = true; closeModal();
    popStory(`<div class="tth">🤝 ${D_.n}が仲間になった！</div><div class="ttx">${D_.join}<br><br>ギルド前の広場で、連れて行く仲間を選べる。好物（${D_.favT}）をごちそうすると♥が上がり、強くなる。</div>`); });
  bind('[data-a=all]', () => openComps());
}
function openComps() {
  const C_ = cpSt(), ks = CP_KEYS.filter(k => C_.j[k]); tut('comp_heart');
  modal('冒険の仲間', `<div class="p">迷宮・ダンジョンには1人連れて行ける。好物の料理を1日1回ごちそうすると♥が上がり、技が強くなる。♥ごとに話が聞ける。</div>` + ks.map(k => { const D_ = CPD[k], lv = cpLv(k), pts = C_.hp[k] || 0, fed = C_.fed[k] === gday();
    return `<div class="row" style="align-items:flex-start">${cpPortrait(k, U * 15)}<div class="t"><b>${D_.n}（${D_.role}）${C_.act === k ? '　<i style="font-style:normal;color:#e8c050">同行中</i>' : ''}</b><span>${'♥'.repeat(lv)}${'♡'.repeat(5 - lv)}　${lv < 5 ? `次の♥まで ${20 - pts % 20}` : '最高'}<br>技：${D_.skill(lv)}<br>好物：${D_.favT}</span></div>
      <div style="display:flex;flex-direction:column;gap:2px"><div class="btn ${C_.act === k ? 'grn' : ''}" data-ca="${k}">${C_.act === k ? '同行中' : '連れて行く'}</div><div class="btn ${fed ? 'dis' : ''}" data-cf="${k}">ごちそう</div><div class="btn" data-cs="${k}">思い出</div></div></div>`; }).join('') +
    (cpNext() && C_.q && C_.q.k === cpNext() ? `<div class="btn" data-a="q" style="margin-top:3px">${CPD[cpNext()].n}の依頼を見る</div>` : ''), 'comps');
  bind('[data-ca]', d => { if (C_.act !== d.ca && sqBusy('c:' + d.ca)) return toast('遠征中の仲間は連れて行けない'); C_.act = C_.act === d.ca ? null : d.ca; CMP = null; dirty = true; openComps(); });
  bind('[data-cf]', d => openCpFeed(d.cf));
  bind('[data-cs]', d => { const k = d.cs, lv = cpLv(k); popStory(`<div class="tth">💬 ${CPD[k].n}の思い出</div><div class="ttx">${lv ? CPD[k].st.slice(0, lv).map((s, i) => `♥${i + 1}：${s}`).join('<br><br>') : 'まだ話を聞いていない。好物をごちそうして仲良くなろう。'}</div>`); });
  bind('[data-a=q]', () => openCpNew());
}
function openCpFeed(k) {
  const C_ = cpSt(), D_ = CPD[k], items = allDishes(); if (C_.fed[k] === gday()) return toast('今日はもうごちそうした');
  const isFav = key => key[0] === 'r' && D_.fav.includes(REC[+key.slice(1)].style);
  modal(`${D_.n}にごちそうする`, `<div class="p">好物（${D_.favT}）は♥がたくさん上がる。金色の料理はさらに1.5倍。</div>` + (items.sort((a, b) => isFav(b.k) - isFav(a.k)).map(x => `<div class="row">${dishIcHTML(x.k, U * 9, x.g)}<div class="t"><b>${x.g ? '金色の' : ''}${dishInfo(x.k).name} ×${x.n}${isFav(x.k) ? '　<i style="font-style:normal;color:#ff9ab0">♥好物</i>' : ''}</b><span>${isFav(x.k) ? '+12' : '+4'}${x.g ? '×1.5' : ''}</span></div><div class="btn" data-k="${x.k}" data-g="${x.g ? 1 : 0}">あげる</div></div>`).join('') || '<div class="p">料理を持っていない。</div>'), 'cpfeed');
  bind('[data-k]', d => { const g = d.g === '1'; if (!takeDish(d.k, g, 1)) return; const before = cpLv(k); C_.hp[k] = Math.min(100, (C_.hp[k] || 0) + Math.round((isFav(d.k) ? 12 : 4) * (g ? 1.5 : 1))); C_.fed[k] = gday(); sfx('ok'); dirty = true;
    const lv = cpLv(k); closeModal(); if (lv > before) popStory(`<div class="tth">♥${lv} ${D_.n}</div><div class="ttx">${D_.st[lv - 1]}<br><br><b>技が強くなった：</b>${D_.skill(lv)}</div>`); else toast(`${D_.n}「ありがとう！」 ♥${'♥'.repeat(lv)}`); });
}
// ---- 迷宮での仲間
let CMP = null;
function compDef() { const k = cpAct(); return k === 'grant' && FL ? 1 - (.2 + .03 * cpLv(k)) : 1; }
function compLuck() { const k = cpAct(); return k === 'crow' && FL ? 1.3 + .05 * cpLv(k) : 1; }
function compTick(dt) {
  const k = cpAct(); if (!k || !FL) { CMP = null; return; } const M = mineState(), h = cpLv(k);
  if (!CMP || CMP.k !== k) CMP = {k, x:player.x + 12, y:player.y + 2, cd:1.5, flip:false};
  const C = CMP; C.cd -= dt; if (C.hit > 0) C.hit -= dt;
  const near = FL.mons.filter(o => Math.hypot(o.x - player.x, o.y - player.y) < 70).sort((a, b) => Math.hypot(a.x - C.x, a.y - C.y) - Math.hypot(b.x - C.x, b.y - C.y))[0];
  let tx = player.x + 12, ty = player.y + 2;
  if (near && k === 'grant' && h >= 2) { tx = near.x + (C.x < near.x ? -10 : 10); ty = near.y; }
  const d = Math.hypot(tx - C.x, ty - C.y); if (d > 2) { const sp = 62 * dt; C.x += (tx - C.x) / d * Math.min(d, sp); C.y += (ty - C.y) / d * Math.min(d, sp); C.flip = tx < C.x; }
  const base = Math.max(3, eqW() ? wAtkVal(eqW()) : 3);
  if (k === 'sera') { if (C.cd <= 0) { C.cd = 3; const v = M.hpMax * (.02 + .005 * h); if (M.hp < M.hpMax) { M.hp = Math.min(M.hpMax, M.hp + v); floatAt(player.x, player.y - 22, '+' + Math.round(v), 'info'); } } if (h >= 5 && !M.seraRev) { M.seraRev = 1; M.revive = 1; } }
  else if (k === 'mia' && near && C.cd <= 0) { C.cd = 1.2; C.flip = near.x < C.x; PROJ.push({x:C.x, y:C.y - 9, tx:near.x, ty:near.y - 6, t:0, k:'arrow'}); const cr = Math.random() < (h >= 3 ? .25 : .08); hitMon(near, base * (.5 + .08 * h) * (cr ? 2 : 1), {kb:2}, {}, cr); }
  else if (k === 'grant' && h >= 2 && near && Math.hypot(near.x - C.x, near.y - C.y) < (near.boss ? 26 : 14) && C.cd <= 0) { C.cd = 1.5; C.hit = .15; hitMon(near, base * .4, {kb:6}, {}, false); }
  else if (k === 'crow' && near && Math.hypot(near.x - C.x, near.y - C.y) < 40 && C.cd <= 0) { C.cd = 1.4; PROJ.push({x:C.x, y:C.y - 9, tx:near.x, ty:near.y - 6, t:0, k:'knife'}); hitMon(near, base * .35, {kb:2}, {}, false); }
}
function drawComp() { const k = cpAct(); if (!k || !CMP) return []; return [{y:CMP.y, f:() => drawChar(k, Math.round(CMP.x), Math.round(CMP.y - (CMP.hit > 0 ? 2 : 0)), CMP.flip)}]; }
function drawTrial(m) { const a = .35 + Math.sin(tNow * 5) * .15; ctx.fillStyle = `rgba(255,200,60,${a})`; ctx.beginPath(); ctx.ellipse(m.x, m.y - 1, 11, 4, 0, 0, 7); ctx.fill(); }
// ---- 宝の地図
const TM_PLACES = () => [...BIOS.filter(b => b.cond()).map(b => [b.sc, b.n]), ...(unl('expedition') ? EXP_TOWNS.filter(t => townOpen(t.id)).map(t => [t.id, t.n]) : [])];
function tmSt() { if (!S.tmap) S.tmap = {maps:[], found:0}; return S.tmap; }
function tmDrop(p, why) { if (!unl('tmap')) return; const T = tmSt(); if (T.maps.length >= 5) return; T.tp = (T.tp || 0) + p; if (Math.random() > p && T.tp < 1) return; T.tp = 0;   /* v0.62 天井：確率の合計が1になったら必ず */ const pl = pick(TM_PLACES()); if (!pl) return; T.maps.push({sc:pl[0], n:pl[1]}); S.known.i.tmap = true; dirty = true; tut('tmap'); toast(`🗺 宝の地図を拾った！（${why}）×印は<b>${pl[1]}</b>のどこか`, 4000); }
function tmSpot(m) { if (m.x) return m; for (let t = 0; t < 200; t++) { const x = Math.round(rnd(16, 128)), y = Math.round(rnd(60, (IMG['bg_' + m.sc] || bgImg()).height - 30)); if (WALK[m.sc] && walkable(m.sc, x, y) && walkable(m.sc, x, y + 8)) { m.x = x; m.y = y; return m; } } m.x = 72; m.y = 120; return m; }
function tmObjs() { if (!S.tmap || !unl('tmap')) return []; return S.tmap.maps.filter(m => m.sc === scene).map(m => { tmSpot(m); return {id:'tm' + m.x, lb:'宝の地図の×印を掘る', r:[m.x - 10, m.y - 6, m.x + 10, m.y + 6], st:[m.x, m.y + 10], act:() => tmDig(m)}; }); }
function tmDig(m) {
  const T = tmSt(); T.maps = T.maps.filter(x => x !== m); T.found = (T.found || 0) + 1; const q = S.cp && S.cp.q; if (q && q.k === 'crow') q.tm = (q.tm || 0) + 1;
  const depth = Math.max(1, (S.mine && S.mine.max) || 1), gold = Math.round(rnd(8000, 20000) * (1 + depth / 50) * (cpAct() === 'crow' && cpLv('crow') >= 4 ? 2 : 1)); S.gold += gold; const got = [`${fmt(gold)}G`];
  const give = (id, n) => { giveBag('i', id, false, n); S.known.i[id] = true; got.push(`${ingName(id)}×${n}`); };
  give(pick(['diamond', 'moonstone', 'emerald', 'ruby', 'sapphire', 'gold']), 2 + Math.floor(Math.random() * 3));
  if (unl('herb') && Math.random() < .5) give(pick(['p_heal2', 'p_luck', 'p_atk', 'p_cure']), 2);
  if (unl('mranch') && Math.random() < .3) give(pick(ING.filter(g => g.src[0] === 'mregg' && g.id !== 'egg_mix')).id, 1);
  if (unl('arms') && Math.random() < .4) { const g = rollGearDrop({f:Math.max(10, depth), v:depth > 50 ? 'deep' : null}, 2); if (g) got.push(gDef(g).name); }
  if (unl('caravan') && Math.random() < .03) { const id = pick(Object.keys(LEG)); giveLegend(id, '宝箱の底に、光る包みが入っていた。'); }
  sfx('ok'); dirty = true;
  popStory(`<div class="tth">💰 宝箱を掘り当てた！</div><div class="ttx" style="text-align:center"><img src="${IMG.bigchest.src}" style="width:${U * 20}px;image-rendering:pixelated"></div><div class="ttx">${m.n}の×印の下から、古い宝箱が出てきた！<br>${got.join('・')}</div>`);
}
function drawTmSpots() { if (!S.tmap || !unl('tmap')) return []; return S.tmap.maps.filter(m => m.sc === scene).map(m => { tmSpot(m); return {y:m.y - 4, f:() => { ctx.drawImage(IMG.digspot, m.x - 10, m.y - 8); if (Math.sin(tNow * 4) > .5) { ctx.fillStyle = '#fff0a0'; ctx.fillRect(m.x - 1, m.y - 12, 2, 2); } }}; }); }
function openTmList() { const T = tmSt(); modal('宝の地図', `<div class="p">×印の場所へ行くと、光る盛り土がある。タップして掘ろう（最大5枚まで持てる）。これまでに掘り当てた宝 ${T.found || 0}個</div>` + (T.maps.map(m => `<div class="row">${ingIc('tmap', U * 9, false, true)}<div class="t"><b>${m.n}</b><span>${BIOS.some(b => b.sc === m.sc) ? '採集の地図から行ける' : '遠征の地図から行ける'}</span></div></div>`).join('') || '<div class="p">地図を持っていない。釣り・魔物・採集でときどき拾える。</div>'), 'tmlist'); }
// ---- 迷宮の隠し部屋
function secretPlace(fl) {
  if (!unl('secret') || fl.boss || fl.vault || fl.ak || Math.random() > .07 * (cpAct() === 'crow' ? 2 : 1)) return;
  for (let t = 0; t < 40; t++) { const x = Math.round(rnd(16, 110)), y = Math.round(rnd(70, 210)); if (fl.rocks.some(o => Math.abs(o.x - x) < 22 && Math.abs(o.y - y) < 18) || (fl.chest && Math.abs(fl.chest.x - x) < 24 && Math.abs(fl.chest.y - y) < 20)) continue; fl.crack = {x, y}; return; }
}
function openVault() {
  const prev = {dg:FL.dg, f:FL.f, eqf:FL.eqf, v:FL.v, fl:FL}, M = mineState(); FL.crack = null; const q = S.cp && S.cp.q; if (q && q.k === 'crow') q.vt = (q.vt || 0) + 1;
  S.stat.vaults = (S.stat.vaults || 0) + 1; tut('secret');
  FL = {f:prev.f, dg:prev.dg, eqf:prev.eqf || prev.f, vault:true, prev, rocks:[], mons:[], ladder:null, broken:0, special:null, elevator:false, lake:null, chest:{x:64, y:116, open:false, big:true}, lava:false, blk:[[58, 126, 86, 142]], curse:M.cl || 0};
  buildMineWalk(); go('mine', 72, 52); sfx('ok'); setTimeout(() => toast('🧱 壁の向こうに、隠し部屋があった！'), 300);
}
function vaultChest() {
  const f = FL.eqf || FL.f, L = Math.min(9, Math.floor(f / 10)), gold = Math.round((800 + Math.random() * 1200) * (L + 1) * curseDrop() * (cpAct() === 'crow' && cpLv('crow') >= 4 ? 2 : 1)); S.gold += gold; FL.chest = null; const got = [`${fmt(gold)}G`];
  const give = (id, n) => { giveBag('i', id, false, n); tripAdd(id, n); S.known.i[id] = true; got.push(`${ingName(id)}×${n}`); };
  give(pick(['diamond', 'moonstone', 'emerald', 'ruby', 'sapphire', 'gold', 'silver']), 2);
  if (unl('arms') && Math.random() < .6) { const g = rollGearDrop(FL, 2); if (g) got.push(gDef(g).name); }
  if (unl('mranch') && Math.random() < .4) give(ING.find(x => x.src[0] === 'mregg' && x.src[1] === eggKind(FL.prev || FL)).id, 1);
  if (unl('herb') && Math.random() < .5) give(pick(['p_heal2', 'p_luck2', 'p_atk2', 'p_def2', 'p_elixir']), 1);
  tmDrop(.35, '隠し部屋の宝箱');
  sfx('ok'); buildMineWalk(); popStory(`<div class="tth">💰 隠し部屋の宝箱</div><div class="ttx">昔の冒険者がしまいこんだ宝だ！<br>${got.join('・')}<br><br>上のはしごで元の階へ戻れる。</div>`);
}
function leaveSpecial() { const p = FL.prev; if (p && p.fl) { FL = p.fl; mineState().floor = FL.f; buildMineWalk(); } else if (p && p.dg) genDgFloor(p.dg, p.f); else genFloor(p ? p.f : 1); go('mine', 72, 52); }
// ---- 5つの町の石碑・封印の扉・古の厨房
const STELE_T = ['port', 'desert', 'tea', 'capital', 'isle'];
const STELE_POS = {port:[132, 180], desert:[122, 174], tea:[116, 176], capital:[84, 196], isle:[80, 196]};
const STELE_TXT = {port:'「海の底にも　かまどの火は消えず」', desert:'「砂の王は　麦を守り」', tea:'「竹林の狐は　桃を供え」', capital:'「氷の竜は　霜を降らせ」', isle:'「火の山は　大地を炊く」'};
function stSt() { if (!S.stl) S.stl = {got:{}, open:false, gift:-1}; return S.stl; }
function openStele(t) {
  tut('stele'); const T = stSt(), first = !T.got[t]; T.got[t] = 1; dirty = true; const n = STELE_T.filter(x => T.got[x]).length;
  popStory(`<div class="tth">🪨 ${TOWNC[t].n}の古い石碑</div><div class="ttx">苔むした石に、古い文字が刻まれている。<br><br><b>${STELE_TXT[t]}</b><br><br>${first ? '石碑の紋を写し取った。' : ''}集めた紋 ${n}/5${n >= 5 ? '<br><b>5つの紋がそろった！ 地下迷宮のB1にある封印の扉が開くはずだ。</b>' : '<br>ほかの町にも同じような石碑があるらしい。'}</div>`);
}
function stObjs() { if (!unl('stele') || !STELE_POS[scene]) return []; const [x, y] = STELE_POS[scene]; return [{id:'stele', lb:'古い石碑', r:[x - 8, y - 22, x + 8, y + 2], st:[x, y + 8], act:() => openStele(scene)}]; }
function drawStele() { if (!unl('stele') || !STELE_POS[scene]) return []; const [x, y] = STELE_POS[scene], i = STELE_T.indexOf(scene); return [{y, f:() => { ctx.drawImage(IMG.steles, i * 16, 0, 16, 24, x - 8, y - 22, 16, 24); if (!(S.stl && S.stl.got[scene]) && Math.sin(tNow * 3) > .3) { ctx.fillStyle = '#fff0a0'; ctx.fillRect(x, y - 18, 1, 1); } }}]; }
function openSealDoor() {
  const T = stSt(), n = STELE_T.filter(x => T.got[x]).length;
  if (n < 5 && !T.open) return toast(`封印の扉：5つのくぼみがある。はまった紋 ${n}/5（5つの町の石碑の紋が必要）`, 3500);
  const prev = {f:FL.f, fl:FL}; FL = {f:1, ak:true, prev, rocks:[], mons:[], ladder:null, broken:0, special:null, elevator:false, lake:null, chest:null, lava:false, blk:[[12, 42, 52, 82], [94, 42, 132, 84], [50, 126, 94, 154]]};
  buildMineWalk(); go('mine', 72, 52); sfx('door');
  if (!T.open) { T.open = true; dirty = true; setTimeout(() => popStory(`<div class="tth">🚪 封印の扉が開いた！</div><div class="ttx">5つの紋が光り、重い扉がゆっくりと開いた。奥には、ずっと昔の料理人たちの<b>古の厨房</b>が眠っていた。<br><br>かまどには、今も火が残っている……。</div>`), 400); }
}
function openAncBook() {
  const T = stSt(), idx = REC.map((r, i) => (D.anc || []).includes(r.name) ? i : -1).filter(i => i >= 0);
  if (!T.book) { T.book = 1; const n = learnRecipes(idx); dirty = true; sfx('ok');
    return popStory(`<div class="tth">📜 古の料理帖</div><div class="ttx">石の台の上に、古い料理帖が置いてあった。<br>${idx.map(i => '『' + REC[i].name + '』').join('')}を覚えた！<br><br>古の竈の火を分けてもらった。<b>これからずっと、料理の値打ち+5%</b>。</div>`); }
  toast('古の料理帖：' + idx.map(i => REC[i].name).join('・'), 3500);
}
function ancShelf() { const T = stSt(); if (T.gift === gday()) return toast('星の器の棚：今日はもう何もない'); T.gift = gday(); const id = pick(['truffle', 'caviar', 'saffron', 'moon_dew', 'naraku', 'phoenix_egg', 'vanilla']); giveBag('i', id, false, 2); S.known.i[id] = true; sfx('ok'); toast(`星の器の棚から ${ingName(id)}×2 を見つけた（1日1回）`, 3000); dirty = true; }
const ancMul = () => (S.stl && S.stl.book ? 1.05 : 1);
// ---- 満月の夜
const isFullMoon = () => { if (!unl('moon')) return false; const d = gday() % 7, h = hmNow(); return (d === 3 && h >= 19 * 60) || (d === 4 && h < 5 * 60); };
const MOON_SHOP = [['tmap', '宝の地図', 15000, () => unl('tmap')], ['egg', 'ランダムな魔物の卵', 25000, () => unl('mranch')], ['p_elixir', 'エリクサー', 6000, () => unl('herb')], ['p_charm', '魔物なつかせの香', 3000, () => unl('herb')],
  ['moon_dew', '月の雫×5', 2000, () => true], ['gekka', '月下美人の花（伝説の食材）', 250000, () => unl('caravan')]];
function openMoonShop() {
  if (!isFullMoon()) return; tut('moon'); if (!S.moon || S.moon.d !== gday() - (hmNow() < 300 ? 1 : 0)) S.moon = {d:gday() - (hmNow() < 300 ? 1 : 0), b:{}};
  modal('月の兎の夜店', `<div class="p">月の兎「満月の夜だけのお店ですぴょん。どれもひとつずつ、早い者勝ち」</div>` + MOON_SHOP.filter(x => x[3]()).map(([id, n, p]) => { const sold = S.moon.b[id];
    return `<div class="row">${id === 'egg' ? ingIc('egg_cave', U * 9, false, true) : ingIc(id, U * 9, false, true)}<div class="t"><b>${n}</b><span>${fmt(p)}G</span></div><div class="btn ${sold ? 'dis' : S.gold >= p ? 'grn' : 'dis'}" data-ms="${id}">${sold ? '売り切れ' : '買う'}</div></div>`; }).join(''), 'moonshop');
  bind('[data-ms]', d => { const it = MOON_SHOP.find(x => x[0] === d.ms); if (!it || S.moon.b[it[0]] || S.gold < it[2]) return; S.gold -= it[2]; S.moon.b[it[0]] = 1; S.stat.moonbuy = (S.stat.moonbuy || 0) + 1;
    if (it[0] === 'tmap') { const T = tmSt(), pl = pick(TM_PLACES()); T.maps.push({sc:pl[0], n:pl[1]}); S.known.i.tmap = true; }
    else if (it[0] === 'egg') { const g = pick(ING.filter(x => x.src[0] === 'mregg' && x.id !== 'egg_mix')); giveBag('i', g.id, false, 1); S.known.i[g.id] = true; }
    else if (it[0] === 'gekka') giveLegend('gekka', '月の兎が、そっと包んでくれた。');
    else { giveBag('i', it[0], false, it[0] === 'moon_dew' ? 5 : 1); S.known.i[it[0]] = true; }
    sfx('coin'); dirty = true; openMoonShop(); });
}
function drawMoonOut() { if (scene !== 'outside' || !isFullMoon()) return []; return [{y:-999, f:() => { ctx.fillStyle = 'rgba(255,248,210,.25)'; ctx.beginPath(); ctx.arc(120, 14, 12, 0, 7); ctx.fill(); ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(120, 14, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#e8dcb0'; ctx.fillRect(117, 12, 2, 2); ctx.fillRect(122, 16, 2, 1); }},
  {y:292, f:() => { ctx.drawImage(IMG.moonstall, 100, 262); drawChar('mrabbit', 95, 292); }}]; }
// ---- 共通：場面に足す物
function v41Objs() {
  const o = [...tmObjs(), ...stObjs()];
  if (scene === 'outside' && isFullMoon()) o.push({id:'moonshop', lb:'月の兎の夜店', r:[96, 258, 142, 296], st:[94, 300], act:() => openMoonShop()});
  if (scene === 'guild' && unl('comp') && guildState().rank >= 6) o.push({id:'cps', lb:cpNext() ? `冒険者${CPD[cpNext()].n}` : '冒険の仲間たち', r:[48, 140, 98, 166], st:[72, 172], act:() => cpNext() ? openCpNew() : openComps()});
  return o;
}
function v41Draw() {
  const out = [...drawTmSpots(), ...drawStele(), ...drawMoonOut()];
  if (scene === 'guild' && unl('comp') && guildState().rank >= 6) { const ks = [...CP_KEYS.filter(k => cpSt().j[k]), cpNext()].filter(Boolean);
    ks.forEach((k, i) => out.push({y:162, f:() => drawChar(k, 54 + i * 12, 162, i % 2 === 1)})); }
  return out;
}

MONT.mslime = {n:'月光スライム', hp:14, atk:4, spd:20, drop:[['moon_dew', .8]]};

// ===== v0.43: やることリスト・通知の履歴・移動の地図・設定（文字の大きさ・速さ）
let TLOG = [];
function tlogPush(msg) { const t = msg.replace(/<br>/g, ' ').replace(/<[^>]+>/g, ''); if (!t.trim()) return; TLOG.unshift({t, at:S && S.t || 0}); if (TLOG.length > 60) TLOG.length = 60; }
function todoList() {
  const out = [], add_ = (i, t, go_) => out.push({i, t, go:go_});
  const ripe = PIDX().filter(j => ready(S.plots[j])).length; if (ripe) add_('🌾', `農場の作物が${ripe}つ実っている`, 'farm');
  const empty = PIDX().filter(j => !S.plots[j].seed).length; if (empty && unl('quality')) add_('🌱', `農場の空いた区画が${empty}つ`, 'farm');
  if (unl('stele') && typeof stSt === 'function') { const T = stSt(), n = STELE_T.filter(x => T.got[x]).length; if (n < 5) add_('🪨', `石碑の紋 ${n}/5（まだ：${STELE_T.filter(x => !T.got[x]).map(x => (TOWNC[x] || {}).n || x).join('・')}の広場）`, 'expmap'); }
  if (S.fac.cellar && S.cellar && S.cellar.slots) { const n = S.cellar.slots.filter(x => x && celDone(x)).length; if (n) add_('🍷', `地下貯蔵庫の熟成が${n}台できあがった`, 'cellar'); }
  if (unl('orders') && S.orders) { const n = S.orders.filter(o => haveDish('r' + o.ri, false) + haveDish('r' + o.ri, true) >= o.n).length; if (n) add_('📜', `届けられる依頼が${n}件（掲示板）`, 'outside');
    else if (!(S.stat.orders > 0) && S.orders.length) { const o = S.orders[0]; add_('📜', `依頼：${REC[o.ri].name}を${o.n}皿作って届ける（${recHint(o.ri)}）`, 'outside'); } }
  if (unl('guild') && S.guild) { const qs = guildQuests(); const n = qs.filter(q => !q.done && (() => { const [a, b] = qProg(q); return a >= b; })()).length; if (n) add_('🛡', `ギルドに報告できる依頼が${n}件`, 'guild');
    if (S.guild.rank < 8 && S.guild.gp >= GUILD_TH[S.guild.rank + 1] && !S.guild.exam) add_('🛡', '昇格試験を受けられる（ギルドの受付）', 'guild'); }
  if (unl('mranch') && S.mr) { const R = S.mr, o = Object.values(R.out || {}).reduce((a, b) => a + b, 0); if (o) add_('🧺', `魔物牧場の素材が${o}個たまっている`, 'mranch'); if (R.mons.length && R.feed < R.mons.length) add_('🌾', '魔物牧場のえさ箱が少ない', 'mranch');
    const h = R.inc.slice(0, mrIncN()).filter(x => x && 1440 - (S.t - x.t0) <= 0).length; if (h) add_('🥚', `孵化小屋の卵が${h}つ生まれそう`, 'mranch');
    if (unl('herb')) { const p = R.plots.filter(x => x && ING[INGI[x.h]].src[1] - (S.t - x.t0) <= 0).length, e = R.plots.filter(x => !x).length; if (p) add_('🌿', `薬草が${p}区画摘める`, 'mranch'); else if (e) add_('🌿', `薬草畑が${e}区画空いている`, 'mranch'); } }
  if (unl('caravan') && S.cara) { const n = S.cara.wag.filter(w => w.st === 'idle').length; if (n) add_('🐫', `待機中の荷馬車が${n}台`, 'cara'); }
  if (unl('expd')) { const n = SQ_TEAMS - sqSt().t.length; if (n > 0 && mrAll().length) add_('🧭', `遠征隊をあと${n}隊送り出せる`, 'squad'); }
  if (unl('oorder') && S.oo && S.oo.l.length) { const n = S.oo.l.filter(o => ooHave(o.k) >= o.n).length; add_('📝', `オリジナル料理の注文が${S.oo.l.length}件${n ? `（${n}件は届けられる）` : ''}`, 'oorder'); }
  if (S.cp && unl('comp')) { const k = cpNext(); if (S.cp.q && cpQDone()) add_('🤝', `${CPD[S.cp.q.k].n}の依頼を達成！ 報告しよう`, 'guild'); for (const c of CP_KEYS) if (S.cp.j[c] && S.cp.fed[c] !== gday()) { add_('♥', `${CPD[c].n}に今日のごちそうをまだあげていない`, 'guild'); break; } }
  if (S.tmap && S.tmap.maps.length) add_('🗺', `宝の地図 ${S.tmap.maps.length}枚（${S.tmap.maps.map(m => m.n).join('・')}）`, 'tmap');
  if (isFullMoon()) add_('🌕', '満月の夜！ 広場に月の兎の夜店', 'outside');
  if (unl('dungeon') && S.dg) { const wk = Math.floor(gday() / 7); const ks = DG_KEYS.filter(k => dgOpen(k) && (S.dg.kb[k] || 0) > 0 && S.dg.wk[k] !== wk); if (ks.length) add_('👑', `今週のボスのごほうびがまだ：${ks.map(k => DGD[k].n).join('・')}`, null); }
  return out;
}
const TRAVEL = [['interior', '宵闇亭（店内）', 109, 108, () => true], ['outside', '店の外（霧月通り）', 72, 300, () => true], ['farm', '裏の農場', 72, 50, () => true], ['hill', '丘の農地', 72, 512, () => unl('hill')],
  ['cellar', '地下貯蔵庫', 124, 66, () => S.fac.cellar > 0], ['upstairs', '2階', 38, 266, () => S.fac.upstairs > 0], ['guild', '冒険者ギルド', 72, 296, () => unl('guild')], ['mranch', '魔物牧場と薬草園', 72, 306, () => unl('mranch')], ['museum', '博物館', 72, 276, () => unl('museum')], ['oldtown', '旧市街', 74, 310, () => unl('restore')]];
function travelOk() { return !['mine', 'mfarm'].includes(scene) && !isBio() && !TOWNC[scene] && !fishSt; }
function goTravel(k) {
  if (k === 'cara') return openCaravan(); if (k === 'tmap') return openTmList(); if (k === 'squad') return openSquad(); if (k === 'oorder') return openAiRecs(); if (k === 'expmap') return openExpMap(); if (!k) return;
  if (!travelOk()) return toast(TOWNC[scene] ? '遠征先からは馬車で帰ろう' : 'ここからは移動できない（迷宮・採集地では使えない）');
  const t = TRAVEL.find(x => x[0] === k); if (!t || !t[4]()) return; closeModal(); go(t[0], t[2], t[3]);
}
function openTodo(tab) {
  tab = tab || 'todo'; tut('todo'); const L = todoList();
  const seg = `<div class="seg"><div class="${tab === 'todo' ? 'on' : ''}" data-tt="todo">やること ${L.length}</div><div class="${tab === 'log' ? 'on' : ''}" data-tt="log">お知らせの履歴</div><div class="${tab === 'go' ? 'on' : ''}" data-tt="go">移動</div></div>`;
  let body = '';
  if (tab === 'todo') body = L.map(x => `<div class="row"><div class="calev">${x.i}</div><div class="t"><b>${x.t}</b></div>${x.go ? `<div class="btn" data-g="${x.go}">${['cara', 'tmap', 'squad', 'oorder', 'expmap'].includes(x.go) ? '見る' : '行く'}</div>` : ''}</div>`).join('') || '<div class="p">いまは急いでやることはない。のんびりいこう。</div>';
  else if (tab === 'log') body = TLOG.map(x => `<div class="row"><div class="t"><span style="font-size:${U * 3.9}px;color:#e8d8b8">${x.t}</span></div></div>`).join('') || '<div class="p">まだお知らせはない。</div>';
  else body = `<div class="p">${travelOk() ? 'ワンタップで移動できる（歩く時間を省く）。' : '<span style="color:#d8806a">迷宮・採集地・遠征先では使えない。</span>'}</div>` + TRAVEL.filter(t => t[4]()).map(t => `<div class="row"><div class="t"><b>${t[1]}</b></div><div class="btn ${scene === t[0] || !travelOk() ? 'dis' : 'grn'}" data-g="${t[0]}">${scene === t[0] ? 'いまここ' : '移動'}</div></div>`).join('') +
    `${unl('mine') ? '<div class="btn" data-a="mine" style="margin-top:3px">⛏ 地下迷宮へ（古井戸）</div>' : ''}${unl('forage') ? '<div class="btn" data-a="bio" style="margin-top:3px">🗺 採集の地図</div>' : ''}${unl('expedition') ? '<div class="btn" data-a="exp" style="margin-top:3px">⚓ 遠征の地図</div>' : ''}`;
  modal('やること・お知らせ・移動', seg + body, 'todo');
  bind('[data-tt]', d => openTodo(d.tt)); bind('[data-g]', d => goTravel(d.g));
  bind('[data-a=mine]', () => { if (!travelOk()) return; closeModal(); go('outside', 48, 222); setTimeout(openMineEntry, 300); });
  bind('[data-a=bio]', () => { if (!travelOk()) return; closeModal(); go('outside', 72, 300); setTimeout(() => typeof openBioMap === 'function' ? openBioMap() : null, 300); });
  bind('[data-a=exp]', () => { if (!travelOk()) return; closeModal(); go('outside', 72, 300); setTimeout(openExpMap, 300); });
}
function uiFs() { return (S && S.ui && S.ui.fs) || 1; }
function uiToastMul() { return (S && S.ui && S.ui.tm) || 1; }
function itemUses(id) {
  const rs = REC.map((r, i) => (S.known.r[i] || S.learned[i]) && r.ings.includes(id) ? r.name : null).filter(Boolean), need = [];
  if (S.guild && unl('guild')) for (const q of guildQuests()) if (!q.done && q.t === 'item' && q.id === id) need.push(`ギルドの依頼（${q.n}個）`);
  if (S.cp && S.cp.q && S.cp.q.k === 'sera' && ['p_heal2', 'p_cure', 'p_heal3'].includes(id)) need.push('セラの依頼');
  if (typeof POTD !== 'undefined' && unl('herb')) { const ps = POT_IDS.filter(p => POTD[p].rc[id]).map(p => ingName(p)); if (ps.length) need.push('調合：' + ps.slice(0, 4).join('・') + (ps.length > 4 ? ' ほか' : '')); }
  return (rs.length ? `<br><span style="color:#c8e0a8">使うレシピ：${rs.slice(0, 5).join('・')}${rs.length > 5 ? ` ほか${rs.length - 5}品` : ''}</span>` : '') + (need.length ? `<br><span style="color:#ffd080">必要：${need.join('・')}</span>` : '');
}


// ===== v0.44: 博物館・王国の復興帳（旧市街）・完全攻略率
const MU_WINGS = {food:'珍しい食材・伝説の食材', fish:'魚拓・ヌシの剥製', mon:'魔物の標本・ボスの戦利品', arms:'武器・鉱石・宝石'};
function muList(w) {
  if (w === 'food') return ING.filter(g => !['pond', 'pier', 'nushi', 'lake', 'ore', 'potion', 'mregg', 'tmap', 'item', 'herb', 'mine'].includes(g.src[0]) && !LAKE.includes(g.id) && (['deep', 'dungeon', 'night', 'cellar'].includes(g.src[0]) || g.value >= 150)).map(g => ({id:'i:' + g.id, n:g.name, have:() => haveIng(g.id) > 0, take:() => takeIng(g.id, false, 1), ic:() => ingIc(g.id, U * 9, false, true), icon:g.icon}));
  if (w === 'fish') return [...POND, ...PIER.filter(g => FSZ[g.id] && !['shrimp', 'scallop'].includes(g.id)), ...LAKE.map(id => ING[INGI[id]]), ...['nushi_pond', 'nushi_pier', 'nushi_lake'].map(id => ING[INGI[id]])].map(g => ({id:'i:' + g.id, n:g.name + (g.src[0] === 'nushi' ? 'の剥製' : 'の魚拓'), have:() => haveIng(g.id) > 0, take:() => takeIng(g.id, false, 1), ic:() => ingIc(g.id, U * 9, false, true), icon:g.icon}));
  if (w === 'mon') return [...Object.keys(MONT).filter(k => !MONT[k].boss).map(k => ({id:'m:' + k, n:MONT[k].n + 'の標本', reg:1, have:() => monStar(k) >= 1, take:() => true, ic:() => charHTML(k, U * 9), ch:k})),
    ...DG_KEYS.map(k => ({id:'b:' + k, n:MONT[DGD[k].boss].n + 'の戦利品', have:() => haveIng(DGD[k].bm) > 0, take:() => takeIng(DGD[k].bm, false, 1), ic:() => bossIcHTML(DGD[k].boss, U * 9), icon:ING[INGI[DGD[k].bm]].icon}))];
  return [...ING.filter(g => g.src[0] === 'ore').map(g => ({id:'i:' + g.id, n:g.name, have:() => haveIng(g.id) > 0, take:() => takeIng(g.id, false, 1), ic:() => ingIc(g.id, U * 9, false, true), icon:g.icon})),
    ...WEAP.filter(x => (x.src || '') === 'legend' || (x.src || '').startsWith('boss')).map(x => ({id:'w:' + x.id, n:x.name + '（写し）', reg:1, have:() => !!(S.gear && gearSt().seen[x.id]), take:() => true, ic:() => icHTML(x.icon, U * 9, 'atlas'), icon:x.icon}))];
}
function muSt() { if (!S.mu) S.mu = {d:{}, ms:{}}; return S.mu; }
const muCount = w => muList(w).filter(x => muSt().d[x.id]).length;
const muTotal = () => Object.keys(MU_WINGS).reduce((a, w) => a + muCount(w), 0);
function openMuWing(w) {
  if (!unl('museum')) return gateMsg('museum'); tut('museum'); const M_ = muSt(), L_ = muList(w), n = muCount(w);
  modal(MU_WINGS[w], `<div class="p">飾った数 ${n}/${L_.length}。${w === 'mon' ? '魔物の標本は図鑑★1で飾れる。ボスの戦利品はボスの素材を1つ寄贈する。' : w === 'arms' ? '鉱石と宝石は1つ寄贈する。伝説・ボスの武器は持っているだけで写しを飾れる（なくならない）。' : '1つ寄贈すると飾られる（なくなる）。'}10点ごとに館長からお礼。</div>` + L_.map(x => { const done = M_.d[x.id], ok = !done && x.have();
    return `<div class="row" style="${done ? '' : 'opacity:' + (ok ? 1 : .55)}"><div style="width:${U * 10}px;${done || ok ? '' : 'filter:brightness(0)'}">${x.ic()}</div><div class="t"><b>${done || ok ? x.n : '？？？'}</b><span>${done ? '展示中' : ok ? '飾れる！' : 'まだ持っていない'}</span></div>${done ? '<div class="btn dis">展示中</div>' : `<div class="btn ${ok ? 'grn' : 'dis'}" data-mu="${x.id}">${x.reg ? '飾る' : '寄贈'}</div>`}</div>`; }).join(''), 'muw');
  bind('[data-mu]', d => { const x = L_.find(y => y.id === d.mu); if (!x || M_.d[x.id] || !x.have()) return; x.take(); M_.d[x.id] = 1; sfx('ok'); dirty = true;
    const k = Math.floor(muCount(w) / 10); if (k > (M_.ms[w] || 0)) { M_.ms[w] = k; const g = 10000 * k; S.gold += g; toast(`🏛 館長「すばらしい！」 ${MU_WINGS[w]}が${k * 10}点に。お礼 +${fmt(g)}G`, 3500); } else toast(`🏛 ${x.n}を飾った`); compCheck(); openMuWing(w); });
}
// ---- 完全攻略率
function compParts() {
  const kn = new Set([...Object.keys(S.known.r), ...Object.keys(S.learned || {}), ...Object.keys((S.nr && S.nr.dexR) || {})]).size;
  const P = [['レシピ', Math.min(kn, REC.length), REC.length], ['食材', new Set([...Object.keys(S.known.i), ...Object.keys((S.nr && S.nr.dexI) || {})].filter(k => INGI[k] != null)).size, ING.length],
    ['魔物', Object.keys(MONT).filter(k => !MONT[k].boss && monStar(k) >= 1).length, Object.keys(MONT).filter(k => !MONT[k].boss).length],
    ['装備', Object.keys((S.gear && S.gear.seen) || {}).length, WEAP.length + ACC.length], ['実績', ACH.filter(a => (S.ach || {})[a.id]).length, ACH.length],
    ['博物館', muTotal(), Object.keys(MU_WINGS).reduce((a, w) => a + muList(w).length, 0)], ['復興', RS_KEYS.filter(k => rsSt().done[k]).length, RS_KEYS.length],
    ['牧場', MR_ALL.filter(k => (S.mr && S.mr.seen[k])).length, MR_ALL.length]];
  return P;
}
function compRate() { const P = compParts(); return P.reduce((a, p) => a + Math.min(1, p[1] / p[2]), 0) / P.length * 100; }
function compRateHTML() {
  if (!unl('museum')) return ''; const r = compRate(), P = compParts(), C_ = S.c100 || {};
  return `<div style="background:linear-gradient(#3a2a18,#1e140c);border:calc(var(--u)*.6) solid var(--brass);border-radius:6px;padding:${U * 1.2}px;margin-bottom:${U * 1.2}px" data-a="comp">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><b style="color:#ffe0a0;font-size:${U * 4.2}px">完全攻略率</b><b style="color:#ffd060;font-size:${U * 5.2}px">${r.toFixed(1)}%</b></div>
    <div style="height:${U * 1.4}px;background:#140c08;border-radius:3px;margin:${U * .6}px 0"><div style="height:100%;width:${r}%;background:linear-gradient(90deg,#c8a040,#ffe080);border-radius:3px"></div></div>
    <div style="font-size:${U * 3.4}px;color:var(--sub)">${P.map(p => `${p[0]} ${p[1]}/${p[2]}`).join('　')}<br>ごほうび：${[25, 50, 75, 100].map(t => `${t}%${C_[t] ? '✓' : ''}`).join('・')}　（100%：金色の宵闇亭・黄金の鍋・称号・黄金像）</div></div>`;
}
function compCheck() {
  if (!unl('museum')) return; if (!S.c100) S.c100 = {}; const r = compRate(), C_ = S.c100;
  for (const [t, g] of [[25, 50000], [50, 200000], [75, 500000]]) if (r >= t && !C_[t]) { C_[t] = 1; S.gold += g; dirty = true; popStory(`<div class="tth">📖 完全攻略率 ${t}%</div><div class="ttx">ここまで集めた！ ごほうび +${fmt(g)}G</div>`); }
  if (r >= 99.95 && !C_[100]) { C_[100] = 1; S.gold += 1000000; S.title = 'すべてを知る者'; dirty = true; tut('c100');
    popStory(`<div class="tth">👑 完全攻略率 100%！</div><div class="ttx">宵闇亭のすべてを知りつくした！<br>・宵闇亭が<b>金色</b>に輝く（料理の値打ち+10%）<br>・<b>黄金の鍋</b>：作る料理がいつも品質★3<br>・博物館の台座に<b>あなたの黄金像</b><br>・称号「すべてを知る者」・1,000,000G</div>`); }
}
const c100 = () => !!(S.c100 && S.c100[100]);
// ---- 王国の復興帳（旧市街）
const RS = {
  chapel:{n:'礼拝堂', fx:'迷宮で受けるダメージ-5%', need:[['i', 'honey', 10], ['i', 'silver', 10], ['i', 'moon_dew', 5], ['m', '煮る', 10]]},
  library:{n:'図書館', fx:'落とし物+10%', need:[['i', 'amethyst', 10], ['i', 'diamond', 3], ['m', '炊く', 10], ['G', 0, 10000]]},
  school:{n:'学び舎', fx:'料理の値打ち+3%', need:[['i', 'flour', 20], ['i', 'egg', 20], ['i', 'iron', 15], ['m', '焼く', 10]]},
  theater:{n:'小劇場', fx:'客足+5%', need:[['i', 'ruby', 8], ['i', 'wine', 10], ['m', '揚げる', 10], ['G', 0, 20000]]},
  bathhouse:{n:'公衆浴場', fx:'迷宮の最大体力+20', need:[['i', 'rock_salt', 20], ['i', 'volcano_salt', 10], ['i', 'onsen_egg', 10], ['m', '蒸す', 10]]},
  garden:{n:'花の庭園', fx:'農場の作物の育ち+10%', need:[['i', 'lavender', 10], ['i', 'honeycomb', 5], ['i', 'emerald', 5], ['m', '生', 10]]},
  smithy:{n:'鍛冶通り', fx:'攻撃+8%', need:[['i', 'iron', 30], ['i', 'gold', 10], ['i', 'coal', 20], ['i', 'ruby', 3]]},
  gate:{n:'王城の門', fx:'料理の値打ち+5%・王様から 500,000G', need:[['G', 0, 300000]], all:1},
};
const RS_KEYS = Object.keys(RS);
const RS_POS = {chapel:[4, 44, 40, 46], library:[100, 58, 40, 46], school:[10, 120, 40, 46], theater:[98, 140, 40, 46], bathhouse:[2, 196, 40, 46], garden:[102, 218, 38, 46], smithy:[22, 262, 40, 46], gate:[46, 0, 52, 44]};
function rsSt() { if (!S.rs) S.rs = {done:{}, paid:{}}; return S.rs; }
const rsOn = k => !!(S.rs && S.rs.done[k]);
function rsDishN(method) { let n = 0; for (const k in S.dish) if (dishInfo(k).method === method) n += S.dish[k]; return n; }
function rsHave(r) { return r[0] === 'G' ? S.gold >= r[2] : r[0] === 'm' ? rsDishN(r[1]) >= r[2] : haveIng(r[1]) >= r[2]; }
function rsTake(r) { if (r[0] === 'G') S.gold -= r[2]; else if (r[0] === 'm') { let left = r[2]; for (const k of Object.keys(S.dish).sort((a, b) => dval(a) - dval(b))) { if (dishInfo(k).method !== r[1]) continue; const t = Math.min(left, S.dish[k]); add(S.dish, k, -t); left -= t; if (!left) break; } } else takeIng(r[1], false, r[2]); }
const rsLabel = r => r[0] === 'G' ? `${fmt(r[2])}G` : r[0] === 'm' ? `「${r[1]}」料理×${r[2]}（どれでも）` : `${ingName(r[1])}×${r[2]}`;
function openRestore(k) {
  if (!unl('restore')) return gateMsg('restore'); tut('restore'); const R_ = rsSt(), B = RS[k];
  if (!k) return openRestoreBook();
  const ready = (!B.all || RS_KEYS.filter(x => x !== 'gate').every(rsOn)), paid = R_.paid[k] || {};
  if (R_.done[k]) { if (k === 'gate' && unl('mirror')) return openMirrorGate(); return toast(`${B.n}：建て直し済み（${B.fx}）`, 3000); }
  modal(`${B.n}の復興`, `<div class="p">納める物がそろうと、${B.n}が建て直される。<br>完成すると：<b>${B.fx}</b>${B.all ? '<br>（ほかの7つの建物をすべて建て直すと納められる）' : ''}</div>` + B.need.map((r, i) => { const d_ = paid[i], ok = rsHave(r);
    return `<div class="row"><div class="t"><b>${rsLabel(r)}</b><span>${d_ ? '納めた' : r[0] === 'm' ? `倉庫に${rsDishN(r[1])}皿` : r[0] === 'i' ? `持っている ${haveIng(r[1])}` : ''}</span></div>${d_ ? '<div class="btn dis">済</div>' : `<div class="btn ${ok && ready ? 'grn' : 'dis'}" data-rp="${i}">納める</div>`}</div>`; }).join('') + '<div class="btn" data-a="book" style="margin-top:3px">復興帳を見る</div>', 'rs');
  bind('[data-rp]', d => { const i = +d.rp, r = B.need[i]; if (paid[i] || !rsHave(r) || !ready) return; rsTake(r); paid[i] = 1; R_.paid[k] = paid; sfx('ok'); dirty = true;
    if (B.need.every((_, j) => paid[j])) { R_.done[k] = 1; if (k === 'bathhouse') { const M = mineState(); M.hpMax += 20; M.stMax += 20; } if (k === 'gate') S.gold += 500000; closeModal(); compCheck();
      popStory(`<div class="tth">🏗 ${B.n}が建て直された！</div><div class="ttx">旧市街に${B.n}がよみがえった。町の人たちが集まってくる。<br><b>${B.fx}</b>${RS_KEYS.every(rsOn) ? '<br><br>すべての建物が建て直された！ 王国がよみがえった。' : ''}</div>`); return; }
    openRestore(k); });
  bind('[data-a=book]', () => openRestoreBook());
}
function openRestoreBook() {
  modal('王国の復興帳', `<div class="p">旧市街の建物を、食材・料理・鉱石を納めて建て直そう。建てるたびに町の絵が変わり、小さなよい効果がずっと続く。</div>` + RS_KEYS.map(k => { const B = RS[k], paid = rsSt().paid[k] || {}, n = B.need.filter((_, j) => paid[j]).length;
    return `<div class="row"><div class="calev">${rsOn(k) ? '🏛' : '🏚'}</div><div class="t"><b>${B.n}${rsOn(k) ? '　<i style="font-style:normal;color:#8ad86a">完成</i>' : ''}</b><span>${B.fx}<br>${rsOn(k) ? '' : `納めた ${n}/${B.need.length}：` + B.need.map(rsLabel).join('・')}</span></div><div class="btn" data-rk="${k}">見る</div></div>`; }).join(''), 'rsbook');
  bind('[data-rk]', d => openRestore(d.rk));
}
// 効果
const rsShop = () => nrShop() * (rsOn('school') ? 1.03 : 1) * (rsOn('gate') ? 1.05 : 1) * (c100() ? 1.1 : 1);
const rsLuck = () => (rsOn('library') ? 1.1 : 1) * nrLoot();
const rsDef = () => rsOn('chapel') ? .95 : 1;
const rsAtk = () => rsOn('smithy') ? 1.08 : 1;
const rsCust = () => rsOn('theater') ? 1.05 : 1;
const rsGrow = () => (rsOn('garden') ? 1.1 : 1) * nrGrow();
// ---- 場面
SCENES.museum = {name:'博物館', short:'博物館', objs:[
  {id:'mudesk', lb:'館長（完全攻略率）', r:[52, 46, 92, 66], st:[72, 74], act:() => openCurator()},
  {id:'mufood', lb:'珍しい食材・伝説の食材', r:[4, 52, 54, 92], st:[30, 102], act:() => openMuWing('food')},
  {id:'mufish', lb:'魚拓・ヌシの剥製', r:[90, 52, 140, 92], st:[114, 102], act:() => openMuWing('fish')},
  {id:'mumon', lb:'魔物の標本・ボスの戦利品', r:[4, 150, 54, 190], st:[30, 200], act:() => openMuWing('mon')},
  {id:'muarms', lb:'武器・鉱石・宝石', r:[90, 150, 140, 190], st:[114, 200], act:() => openMuWing('arms')},
  {id:'mustat', lb:'中央の台座', r:[58, 204, 86, 240], st:[72, 248], act:() => toast(c100() ? '👑 あなたの黄金像。宵闇亭のすべてを知る者の証。' : '空の台座。完全攻略率100%で、ここに何かが飾られるらしい。', 3000)},
  {id:'muexit', lb:'店の外へ', r:[56, 268, 88, 288], st:[72, 278], act:() => go('outside', 110, 266)},
]};
WALKDEF.museum = {areas:[[14, 70, 130, 282], [56, 68, 88, 288]], blocks:[[2, 50, 56, 98], [88, 50, 142, 98], [2, 148, 56, 196], [88, 148, 142, 196], [50, 44, 94, 68], [58, 204, 86, 242]]};
SCENES.oldtown = {name:'旧市街', short:'旧市街', objs:[
  ...RS_KEYS.map(k => { const [x, y, w, h] = RS_POS[k]; return {id:'rs_' + k, lb:() => `${RS[k].n}${rsOn(k) ? '' : '（復興する）'}`, r:[x, y, x + w, y + h], st:[x + w / 2, y + h + 6], act:() => openRestore(k)}; }),
  {id:'rsexit', lb:'店の外へ', r:[56, 304, 92, 320], st:[74, 312], act:() => go('outside', 110, 266)},
]};
SCENES.oldtown.objs.forEach(o => { if (typeof o.lb === 'function') { const f = o.lb; Object.defineProperty(o, 'lb', {get:f}); } });
WALKDEF.oldtown = {areas:[[0, 44, 143, 318]], blocks:RS_KEYS.filter(k => k !== 'gate').map(k => { const [x, y, w, h] = RS_POS[k]; return [x, y + 10, x + w, y + h]; }).concat([[14, 96, 42, 114]])};
function openCurator() {
  if (!unl('museum')) return gateMsg('museum'); tut('museum'); compCheck();
  modal('館長', `<div class="p">館長「ようこそ、宵闇亭の博物館へ。あなたが集めた物を、町のみんなに見てもらいましょう」</div>${compRateHTML()}` +
    Object.keys(MU_WINGS).map(w => `<div class="row"><div class="t"><b>${MU_WINGS[w]}</b><span>${muCount(w)}/${muList(w).length}</span></div><div class="btn" data-w="${w}">見る</div></div>`).join('') +
    (unl('restore') ? '<div class="btn big blu" data-a="rs" style="margin-top:3px">📜 王国の復興帳</div>' : ''), 'curator');
  bind('[data-w]', d => openMuWing(d.w)); bind('[data-a=rs]', () => openRestoreBook());
}
function drawMuseum() {
  if (!S.mu) return [];
  const out = [], cases = {food:[4, 52], fish:[90, 52], mon:[4, 150], arms:[90, 150]};
  for (const w in cases) { const [x0, y0] = cases[w], items = muList(w).filter(x => S.mu.d[x.id]).slice(0, 15);
    items.forEach((x, i) => { const r = Math.floor(i / 5), c = i % 5, px = x0 + 5 + c * 9, py = y0 + 6 + r * 12;
      out.push({y:py, f:() => { if (x.ch) ctx.drawImage(IMG.chars, CH[x.ch] * 16, 0, 16, 18, px, py, 8, 9); else if (x.icon != null) drawIcon(x.icon, px, py, 8); }}); }); }
  if (c100()) out.push({y:222, f:() => { ctx.save(); ctx.filter = 'sepia(1) saturate(4) brightness(1.3)'; drawChar('player', 72, 214); ctx.restore(); if (Math.sin(tNow * 4) > .3) { ctx.fillStyle = '#fff8c0'; ctx.fillRect(78, 198, 1, 1); } }});
  out.push({y:66, f:() => drawChar('curator', 72, 64)});
  return out;
}
function drawGoldShop() {
  ctx.save(); ctx.beginPath(); ctx.moveTo(40, 56); ctx.lineTo(104, 56); ctx.lineTo(121, 79); ctx.lineTo(118, 79); ctx.lineTo(118, 121); ctx.lineTo(26, 121); ctx.lineTo(26, 79); ctx.lineTo(23, 79); ctx.closePath(); ctx.clip();
  ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = 'rgba(255,200,60,.75)'; ctx.fillRect(20, 50, 104, 75);
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,210,90,${.08 + .04 * Math.sin(tNow * 2)})`; ctx.fillRect(20, 50, 104, 75); ctx.restore();
  for (let i = 0; i < 6; i++) { const ph = tNow * 1.3 + i * 1.7, a = Math.sin(ph); if (a > .6) { ctx.fillStyle = '#fff4c0'; const x = 30 + ((i * 37) % 84), y = 60 + ((i * 23) % 56); ctx.fillRect(x, y, 1, 1); if (a > .85) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } } }
}
function drawOldtown() {
  const out = [];
  for (const k of RS_KEYS) { const [x, y, w, h] = RS_POS[k], im = IMG['bld_' + k]; if (!im) continue; const on = rsOn(k);
    out.push({y:y + h, f:() => ctx.drawImage(im, on ? w + 1 : 0, 0, w + 1, h + 1, x, y, w + 1, h + 1)}); }
  if (rsOn('gate') && unl('mirror') && IMG.mgate) out.push({y:44.5, f:() => { ctx.save(); ctx.globalAlpha = .85 + .15 * Math.sin(tNow * 2); ctx.drawImage(IMG.mgate, 59, 11); ctx.restore(); }});
  return out;
}
function openWayChoice() {
  if (!unl('mranch') && !unl('museum')) return go('guild', 72, 296);
  modal('道しるべ', `<div class="btn big blu" data-w="g">⚔ 冒険者ギルドへ</div>${unl('mranch') ? '<div class="btn big grn" data-w="m" style="margin-top:4px">🐾 魔物牧場と薬草園へ</div>' : ''}${unl('museum') ? '<div class="btn big" data-w="u" style="margin-top:4px">🏛 博物館へ</div>' : ''}${unl('restore') ? '<div class="btn big" data-w="o" style="margin-top:4px">🏚 旧市街へ（王国の復興）</div>' : ''}`, 'way');
  bind('[data-w]', d => { closeModal(); if (d.w === 'g') go('guild', 72, 296); else if (d.w === 'm') go('mranch', 72, 306); else if (d.w === 'u') go('museum', 72, 276); else go('oldtown', 74, 310); });
}


// ===== v0.45: 異界の門（鏡の向こうの宵闇亭：鏡の町ウラヤミ・鏡の畑・鏡の回廊）・暖簾分け
const MIRROR_RN = ['逆さ茸のポタージュ', '映し麦のパン', '水鏡の魚の塩釜焼き', '鏡トマトの冷製パスタ', '月影かぶの含め煮', '銀の苺のタルト', '硝子豆のスープ', '鏡月の蜜のパンケーキ', '夜光クリームのグラタン', '星砂糖のプリン', '鏡の葡萄酒煮込み', 'ウラヤミの逆さ晩餐'];
const MIRROR_RI = MIRROR_RN.map(n => REC.findIndex(r => r.name === n));
const MIRROR_IDS = new Set(ING.filter(g => (g.src[0] === 'town' && g.src[1] === 'mirror') || g.src[0] === 'mfarm' || (g.src[0] === 'dungeon' && g.src[1] === 'mirror')).map(g => g.id));
const MIRROR_STALLS = [
  {n:'蜜と砂糖の店', items:[['mirror_honey', 1], ['hoshi_sato', 1], ['yakou_cream', 2]]},
  {n:'鏡の魚屋', items:[['mizukagami', 1], ['silver_salt', 1], ['squid', 1]]},
  {n:'逆さ八百屋', items:[['sakasa_take', 1], ['utsushi_mugi', 1], ['kagami_tomato', 2], ['gin_ichigo', 3]]},
  {n:'鏡の酒屋', items:[['kagami_wine', 1], ['wine', 1], ['cheese', 1]]},
];
TOWNC.mirror = {n:'鏡の町ウラヤミ', ic:'🪞', ri:MIRROR_RI, stalls:MIRROR_STALLS, inn:'宿「うたかた」', innPos:[123, 268], arrive:[72, 300], tutSc:'sc_mirror',
  like:'<b>鏡の向こうの食材を使う料理（×1.35）</b>と<b>ウラヤミの料理（×1.6）</b>', likeTag:'🪞好まれる', isLike:r => r.ings.some(id => MIRROR_IDS.has(id)),
  diner:'逆さ食堂', trN:'鏡の商館（交易所）', dinerTalk:'逆さ食堂の給仕「……ませいゃしっらい、いえ、いらっしゃいませ。こちらの料理、お教えしましょう。お代はいただきますが」',
  tradeTalk:'鏡の商館の番頭「向こう側の品は、こちらでは何でも珍しいのです。今日の『求む』は高く買い取りますよ」',
  wantSrc:['forage', 'pier', 'tree', 'cellar', 'town:port', 'town:isle', 'town:capital']};
TOWN_SHORT.mirror = 'ウラヤミ';
SCENES.mirror = townScene('mirror', {id:'bigmirror', lb:'うつしの姿見（鏡の畑・鏡の回廊）', r:[102, 120, 140, 170], st:[121, 178], act:() => openBigMirror()}, '帰りの鏡（旧市街へ）');
{ const o = SCENES.mirror.objs.find(o => o.id === 'coach'); o.act = () => mirrorTravel('home'); }
WALKDEF.mirror = {areas:TOWN_AREAS, blocks:[...STALL_BLK, [16, 118, 58, 132], [9, 149, 63, 181], [4, 136, 12, 150], [58, 124, 63, 134], [90, 124, 95, 134], [58, 202, 63, 212], [92, 200, 97, 210],
  [102, 120, 140, 172], [124, 194, 143, 214], [0, 206, 12, 222], [75, 164, 99, 178], [0, 208, 48, 226], [56, 208, 102, 226], [100, 196, 143, 226]]};
const MCROP = {kagami_tomato:{min:240, seed:120, y:[3, 5]}, tsukikage_kabu:{min:180, seed:100, y:[3, 5]}, gin_ichigo:{min:360, seed:180, y:[3, 6]}, garasu_mame:{min:150, seed:80, y:[4, 6]}};
const MPLOT_XY = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [16 + (i % 4) * 30, 84 + Math.floor(i / 4) * 34]);
function mxSt() { if (!S.mx) S.mx = {plots:Array(8).fill(null)}; return S.mx; }
const mxNeed = c => MCROP[c].min / (rsGrow() * nrGrow());
SCENES.mfarm = {name:'鏡の畑', short:'鏡の畑', objs:[
  ...MPLOT_XY.map(([x, y], i) => ({id:'mp' + i, lb:'鏡の畑の区画', r:[x - 1, y - 1, x + 25, y + 23], st:[x + 12, y + (i < 4 ? 28 : 30)], act:() => openMPlot(i)})),
  {id:'mfexit', lb:'鏡の町へ', r:[58, 300, 86, 320], st:[72, 306], act:() => go('mirror', 121, 180)}]};
WALKDEF.mfarm = {areas:[[2, 64, 141, 316]], blocks:[...MPLOT_XY.map(([x, y]) => [x - 1, y - 1, x + 25, y + 23]), [12, 176, 28, 198], [106, 160, 134, 198], [56, 154, 61, 172], [84, 154, 89, 172], [14, 244, 48, 268], [98, 248, 130, 268], [96, 282, 132, 294]]};
function openMPlot(i) {
  tut('mfarm'); const X = mxSt(), p = X.plots[i];
  if (!p) {
    modal('鏡の畑', `<div class="p">鏡の向こうだけで育つ作物。種を買ってまくと、時間がたつと実る（眠っている間も育つ）。</div>` + Object.keys(MCROP).map(c => { const C_ = MCROP[c];
      return `<div class="row">${ingIc(c, U * 9, false, true)}<div class="t"><b>${ingName(c)}</b><span>${Math.round(mxNeed(c) / 60 * 10) / 10}時間で${C_.y[0]}〜${C_.y[1]}個（1個 ${ING[INGI[c]].value}G）</span></div><div class="btn ${S.gold >= C_.seed ? 'grn' : 'dis'}" data-mc="${c}">まく<br>${fmt(C_.seed)}G</div></div>`; }).join(''), 'mplot');
    bind('[data-mc]', d => { const C_ = MCROP[d.mc]; if (S.gold < C_.seed) return; S.gold -= C_.seed; X.plots[i] = {c:d.mc, t0:S.t}; sfx('ok'); dirty = true; closeModal(); toast(`🌱 ${ingName(d.mc)}の種をまいた`); });
    return;
  }
  const need = mxNeed(p.c), el = S.t - p.t0;
  if (el < need) return toast(`🌱 ${ingName(p.c)}：育っている（あと${Math.ceil((need - el) / 60 * 10) / 10}時間）`, 2500);
  const C_ = MCROP[p.c], n = Math.round(C_.y[0] + Math.random() * (C_.y[1] - C_.y[0])); add(S.inv, p.c, n); S.known.i[p.c] = true; X.plots[i] = null; sfx('ok'); dirty = true;
  if (curTownXp()) expAddXp('mirror', 6); toast(`🌾 ${ingName(p.c)}を ${n}個 収穫した（倉庫へ）`);
}
const curTownXp = () => unl('mirror');
function drawMFarm() {
  const X = S.mx; if (!X) return []; const out = [];
  X.plots.forEach((p, i) => { if (!p) return; const [x, y] = MPLOT_XY[i], r = Math.min(1, (S.t - p.t0) / mxNeed(p.c)), g = ING[INGI[p.c]];
    out.push({y:y + 20, f:() => {
      if (r >= 1) { for (let k = 0; k < 3; k++) drawIcon(g.icon, x + 2 + k * 7, y + 6 + (k % 2) * 4, 8); if (Math.sin(tNow * 3 + i) > .6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4 + (i * 7) % 16, y + 3, 1, 1); } return; }
      ctx.fillStyle = r < .5 ? '#6ab0e0' : '#8ad0f0'; const h = r < .5 ? 2 : 4;
      for (let k = 0; k < 6; k++) { const sx = x + 3 + (k % 3) * 8, sy = y + 6 + Math.floor(k / 3) * 9; ctx.fillRect(sx, sy - h, 1, h); if (r >= .5) { ctx.fillRect(sx - 1, sy - h, 1, 1); ctx.fillRect(sx + 1, sy - h + 1, 1, 1); } }
    }}); });
  return out;
}
function openBigMirror() {
  modal('うつしの姿見', `<div class="p">姿見の中には、なつかしい宵闇亭の夕暮れが映っている。鏡の面にふれると、行き先がうかぶ。</div>
    <div class="btn big grn" data-w="f">🌱 鏡の畑へ</div><div class="btn big red" data-w="d" style="margin-top:4px">⚔ 鏡の回廊へ（全20階＋最奥）</div>`, 'bigm');
  bind('[data-w]', d => { if (d.w === 'f') { closeModal(); go('mfarm', 72, 300); } else openDgEntry('mirror', 'mirror'); });
}
function openMirrorGate() {
  if (!unl('mirror')) return gateMsg('mirror'); tut('mirror');
  modal('異界の門', `<img src="${IMG.mgate.src}" style="width:${U * 20}px;display:block;margin:0 auto;image-rendering:pixelated"><div class="p">王城の門の奥で、銀の鏡がゆらいでいる。<br>くぐると「鏡の向こうの宵闇亭」の世界、<b>鏡の町ウラヤミ</b>へ（1時間かかる）。帰りは町の下の「帰りの鏡」から。</div><div class="btn big blu" data-a="go">鏡をくぐる</div>`, 'mgate');
  bind('[data-a=go]', () => mirrorTravel('mirror'));
}
function mirrorTravel(dest) {
  closeModal(); $('fade').style.opacity = 1; sleeping = true;
  setTimeout(() => {
    rep_ = {}; simulating = true; let left = 60; while (left > 0) { const dd = Math.min(2, left); step(dd, false); left -= dd; } simulating = false;
    const E = expState(); if (dest === 'home') { E.at = null; go('oldtown', 72, 52); } else { E.at = 'mirror'; if (!E.xp.mirror) E.xp.mirror = 0; go('mirror', 72, 300); }
    $('fade').style.opacity = 0; sleeping = false; dirty = true; lastLogic = Date.now();
    toast(dest === 'home' ? '🪞 鏡をくぐって、旧市街に戻ってきた（1時間）' : '🪞 鏡をくぐると、そこは何もかもが逆さまの町だった（1時間）', 3500);
    if (dest !== 'home') setTimeout(() => tut('sc_mirror'), 900);
  }, 400);
}
// ---- のれん（暖簾分け）
function nrSt() { if (!S.nr) S.nr = {n:0, star:0, tot:0, up:{}, col:0, gd:-1, dexR:{}, dexI:{}}; for (const k of ['up', 'dexR', 'dexI']) if (!S.nr[k]) S.nr[k] = {}; return S.nr; }
const nrN = () => (S.nr && S.nr.n) || 0;
const nrL = k => (S.nr && S.nr.up && S.nr.up[k]) || 0;
const nrShop = () => 1 + .1 * nrL('earn');
const nrGrow = () => 1 + .1 * nrL('grow');
const nrLoot = () => (1 + .1 * nrL('loot')) * (1 + .3 * nrN());
const nrDexR = i => !!(S.nr && S.nr.dexR && S.nr.dexR[i]);
const NR_UP = [
  {k:'earn', g:'稼ぎと成長', n:'のれんの味', d:'料理の値打ち+10%', max:10, c:2},
  {k:'grow', g:'稼ぎと成長', n:'のれんの畑', d:'作物（鏡の畑も）の育ち+10%', max:5, c:2},
  {k:'staff', g:'稼ぎと成長', n:'のれんの教え', d:'従業員の経験+25%', max:4, c:3},
  {k:'loot', g:'稼ぎと成長', n:'のれんの運', d:'迷宮の落とし物+10%', max:5, c:3},
  {k:'gold', g:'最初からの特典', n:'支度金', d:'暖簾分けのとき 所持金+20,000G', max:10, c:1},
  {k:'skip', g:'最初からの特典', n:'のれんの経験', d:'暖簾分けのとき 左上の目標を5つ達成した所から始める（その解放も）', max:8, c:4},
  {k:'relearn', g:'最初からの特典', n:'のれんの写本', d:'図鑑に載っているレシピを覚え直す値段-20%', max:4, c:2},
  {k:'gourmet', g:'周回だけの新要素', n:'旅の美食家', d:'毎朝10時、美食家が倉庫の一番高い料理を1皿、値打ち×(2＋0.5×Lv)で買っていく', max:4, c:3},
];
const NR_COL = [['藍', '#2a3a7a'], ['紅', '#a8282a'], ['萌黄', '#6a9a2a'], ['白', '#e8e4dc'], ['紫', '#6a3a8a'], ['金', '#c8a040'], ['墨', '#1a1a1e'], ['桜', '#e8a0b8']];
const nrCost = u => u.c * (nrL(u.k) + 1);
function nrGain() {
  const r = compRate(), e = (S.stat && S.stat.earned) || 0, kb = (S.dg && S.dg.kb && S.dg.kb.mirror) || 0;
  return [['基本', 8], ['完全攻略率', Math.floor(r / 10 * 3)], ['売上合計', Math.max(0, Math.min(30, Math.floor(Math.log10(Math.max(1, e / 100000)) * 7.5)))], ['鏡の店主を倒した', Math.min(15, kb * 3)], ['これまでの暖簾分け', nrN() * 3]];   // v0.47: ☆を1.5倍
}
function norenFacHTML() {
  if (!unl('noren') && !nrN()) return '';
  const N = nrSt();
  return `<div class="h">🏮 のれん（暖簾分け）</div><div class="row"><div class="t"><b>${nrN() ? `${nrN() + 1}代目の宵闇亭` : '初代の宵闇亭'}　のれん☆${N.star}</b><span>のれん☆の強化、のれんの色、図鑑のレシピの覚え直し${unl('noren') ? '、暖簾分け' : ''}</span></div><div class="btn" data-a="noren">ひらく</div></div>`;
}
function openNoren() {
  const N = nrSt(), canSplit = unl('noren');
  let h = `<div class="p">「暖簾分け」で、<b>図鑑と実績・博物館の展示</b>と<b>好きな装備1つ</b>だけを持って、新しい宵闇亭を最初から始める（レシピ・お金・建物・仲間・牧場も最初から）。<br>そのかわり<b>のれん☆</b>がもらえ、永久に強くなる。周回ごとに迷宮の魔物が強くなり（体力+25%・攻撃+15%、5周目まで）、落とし物も増える（+30%）。</div>`;
  h += `<div class="h">のれん☆ ${N.star}（これまでに ${N.tot}）</div>`;
  let g0 = '';
  for (const u of NR_UP) { if (u.g !== g0) { g0 = u.g; h += `<div class="p" style="color:var(--brass)"><b>${g0}</b></div>`; }
    const L = nrL(u.k), mx = L >= u.max, c = nrCost(u);
    h += `<div class="row"><div class="t"><b>${u.n}　Lv${L}/${u.max}</b><span>${u.d}</span></div>${mx ? '<div class="btn dis">最大</div>' : `<div class="btn ${N.star >= c ? 'grn' : 'dis'}" data-nu="${u.k}">☆${c}</div>`}</div>`; }
  h += `<div class="p" style="color:var(--brass)"><b>のれんの色</b>（暖簾分けのたびに1色ずつ増える。店の入口ののれんの色が変わる）</div><div style="display:flex;gap:3px;flex-wrap:wrap">${NR_COL.map(([n, c], i) => i <= nrN() ? `<div class="btn ${N.col === i ? 'grn' : ''}" data-nc="${i}" style="padding:2px 6px"><i style="font-style:normal;display:inline-block;width:.9em;height:.9em;background:${c};border:1px solid #000;vertical-align:middle"></i> ${n}</div>` : `<div class="btn dis" style="padding:2px 6px">🔒</div>`).join('')}</div>`;
  if (Object.keys(N.dexR).length) h += `<div class="btn big blu" data-a="relearn" style="margin-top:4px">📖 図鑑のレシピを覚え直す</div>`;
  if (canSplit) h += `<div class="btn big red" data-a="split" style="margin-top:6px">🏮 暖簾分けをする</div>`;
  modal('のれん', h, 'noren');
  bind('[data-nu]', d => { const u = NR_UP.find(x => x.k === d.nu), c = nrCost(u); if (N.star < c || nrL(u.k) >= u.max) return; N.star -= c; N.up[u.k] = nrL(u.k) + 1; sfx('ok'); dirty = true; openNoren(); });
  bind('[data-nc]', d => { N.col = +d.nc; dirty = true; openNoren(); });
  bind('[data-a=relearn]', () => openRelearn());
  bind('[data-a=split]', () => openSplit());
}
function openRelearn() {
  const N = nrSt(), off = 1 - .2 * nrL('relearn'), price = i => Math.round(Math.max(300, REC[i].value * 6) * off / 10) * 10;
  const by = {}; for (const i of Object.keys(N.dexR).map(Number)) if (!S.known.r[i] && !S.learned[i] && REC[i]) (by[REC[i].method] = by[REC[i].method] || []).push(i);
  const ms = Object.keys(by);
  modal('図鑑のレシピを覚え直す', `<div class="p">前の宵闇亭で作ったことのあるレシピを、調理法ごとにまとめて覚え直せる${off < 1 ? `（のれんの写本で${Math.round((1 - off) * 100)}%引き）` : ''}。</div>` + (ms.length ? ms.map(m => { const c = by[m].reduce((a, i) => a + price(i), 0);
    return `<div class="row"><div class="t"><b>「${m}」のレシピ ${by[m].length}品</b><span>1品 ${fmt(price(by[m][0]))}G〜</span></div><div class="btn ${S.gold >= c ? 'grn' : 'dis'}" data-rm="${m}">覚える<br>${fmt(c)}G</div></div>`; }).join('') : '<div class="p">覚え直すレシピはもうない。</div>'), 'relearn');
  bind('[data-rm]', d => { const c = by[d.rm].reduce((a, i) => a + price(i), 0); if (S.gold < c) return; S.gold -= c; const n = learnRecipes(by[d.rm]); sfx('ok'); toast(`📖 「${d.rm}」のレシピを ${n}品 覚え直した`, 3000); openRelearn(); });
}
let nrArm = 0, nrCarry = null;
function openSplit() {
  const parts = nrGain(), gain = parts.reduce((a, p) => a + p[1], 0), G_ = gearSt();
  const list = G_.list.slice().sort((a, b) => (b.r || 0) - (a.r || 0) || ((gDef(b) || {}).tier || 0) - ((gDef(a) || {}).tier || 0));
  modal('暖簾分け', `<div class="p">この宵闇亭をのれんごと弟子にゆずり、あなたは新しい町角で<b>${nrN() + 2}代目の宵闇亭</b>を始める。</div>
    <div class="h">もらえるのれん☆　${gain}</div>${parts.map(p => `<div class="row"><div class="t"><b>${p[0]}</b></div><div style="color:var(--brass)">☆${p[1]}</div></div>`).join('')}
    <div class="h">残る物</div><div class="p">図鑑（料理・食材・魔物・装備・牧場・日記）／実績と称号／博物館の展示／完全攻略率のごほうび／チュートリアルと設定／のれん☆と強化</div>
    <div class="h">持っていく装備（1つ）</div>${list.length ? list.slice(0, 40).map(g => { const D_ = gDef(g); return D_ ? `<div class="row"><div style="width:${U * 9}px">${icHTML(D_.icon, U * 9, 'atlas')}</div><div class="t"><b style="color:${RAR_C[g.r || 0]}">${D_.name}</b><span>${(g.fx || []).length ? '効果' + g.fx.length + 'つ' : ''}</span></div><div class="btn ${nrCarry === g.uid ? 'grn' : ''}" data-cg="${g.uid}">${nrCarry === g.uid ? '選んだ' : '選ぶ'}</div></div>` : ''; }).join('') : '<div class="p">装備を持っていない。</div>'}
    <div class="btn big red" data-a="do" style="margin-top:6px">${nrArm ? 'もう一度押すと暖簾分けする（元に戻せない）' : '🏮 暖簾分けをする'}</div>`, 'split');
  bind('[data-cg]', d => { nrCarry = +d.cg; openSplit(); });
  bind('[data-a=do]', () => { if (!nrArm) { nrArm = 1; openSplit(); setTimeout(() => nrArm = 0, 4000); return; } doNoren(gain); });
}
function doNoren(gain) {
  const N = nrSt(), old = S, carry = nrCarry != null ? gearSt().list.find(g => g.uid === nrCarry) : null;
  for (const i in old.known.r) if (old.known.r[i]) N.dexR[i] = 1; for (const i in old.learned || {}) if (old.learned[i] && old.known.r[i]) N.dexR[i] = 1;
  for (const k in old.known.i) if (old.known.i[k]) N.dexI[k] = 1;
  N.n++; N.star += gain; N.tot += gain; N.just = gain;
  const n = fresh();
  for (const k of ['ach', 'title', 'kills', 'fishRec', 'bioSeen', 'story', 'mu', 'c100', 'ui', 'tut', 'creative']) if (old[k] !== undefined) n[k] = old[k];
  n.nr = N; n.gv = 11; n.unl = {}; n.goal = Math.min(GOALS.length, 5 * nrL('skip')); n.gold += 20000 * nrL('gold');
  n.gear = {list:[], eq:{}, seen:(old.gear && old.gear.seen) || {}, n:0, ench:0}; if (carry) { n.gear.n = 1; n.gear.list.push({...carry, uid:1}); }
  if (old.mr && old.mr.seen) n.mr = {lv:1, mons:[], box:[], fam:null, inc:[null, null, null, null], plots:[null, null, null, null, null, null], feed:0, day:0, out:{}, seen:old.mr.seen, made:old.mr.made || {}, nPot:0, buf:{}, n:0};
  S = n; syncShelf(); nrArm = 0; nrCarry = null; saveNow(true); location.reload();
}
function v45Tick() {
  if (!S.nr) return;
  if (S.nr.just && !simulating && !tutOpen && typeof popStory === 'function' && $('intro') == null) { const g = S.nr.just; delete S.nr.just; dirty = true;
    popStory(`<div class="tth">🏮 ${nrN() + 1}代目の宵闇亭、開店！</div><div class="ttx">のれんを分けて、新しい宵闇亭を始めた。<br>のれん☆ +${g}（いま ${S.nr.star}）<br>「施設」タブの<b>のれん</b>で、☆を使って強くなろう。図鑑のレシピの覚え直しもそこから。<br>周回${nrN()}：迷宮の魔物の体力+${25 * Math.min(5, nrN())}%・落とし物+${30 * nrN()}%</div>`); }
  if (nrL('gourmet') && S.nr.gd !== gday() && hmNow() >= 600) { S.nr.gd = gday();
    const ks = Object.keys(S.dish).filter(k => S.dish[k] > 0); if (!ks.length) return; const k = ks.sort((a, b) => dval(b) - dval(a))[0], p = Math.round(dval(k) * (2 + .5 * nrL('gourmet')));
    add(S.dish, k, -1); S.gold += p; S.stat.earned = (S.stat.earned || 0) + p; dirty = true; if (!simulating) toast(`🎩 旅の美食家が「${dishInfo(k).name}」を ${fmt(p)}G で買っていった`, 3500); }
}
function drawNoren() {
  if (!nrN()) return; const c = NR_COL[(S.nr.col || 0)] || NR_COL[0];
  ctx.fillStyle = c[1]; for (let k = 0; k < 4; k++) ctx.fillRect(64 + k * 4, 102, 3, 6 + (k % 2));
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(71, 104, 2, 2); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(64, 102, 15, 1);
}
Object.assign(UNL, {
  mirror:{n:'異界の門', i:'🪞', d:'旧市街の王城の門の奥に、ゆらぐ鏡の門が現れた。くぐると「鏡の向こうの宵闇亭」の世界、鏡の町ウラヤミへ。町・鏡の畑・鏡の回廊（全20階）がある。', tut:'mirror'},
  noren:{n:'暖簾分け', i:'🏮', d:'「施設」タブの「のれん」から暖簾分けができるようになった。図鑑と実績・博物館の展示と装備1つを残して、新しい宵闇亭を最初から始める。のれん☆で永久に強くなる。', tut:'noren'},
});
Object.assign(TUT, {
  mirror:['異界の門', '旧市街の<b>王城の門</b>をタップすると、鏡の門をくぐって<b>鏡の町ウラヤミ</b>へ（1時間）。<br>町には屋台・食堂・交易所・宿がある。右の<b>うつしの姿見</b>から<b>鏡の畑</b>と<b>鏡の回廊</b>（全20階＋最奥のボス）へ。帰りは町の下の「帰りの鏡」から。'],
  sc_mirror:['鏡の町ウラヤミ', '何もかもが逆さまの町。鏡の向こうの食材を使う料理が好まれ、ウラヤミの料理は特に高く売れる。<br>屋台・逆さ食堂（レシピ）・鏡の商館（交易所）・宿「うたかた」は、ほかの町と同じように使える。'],
  mfarm:['鏡の畑', '区画をタップして種をまく（その場で種代を払う）。時間がたつと実り、もう一度タップで収穫（倉庫へ）。鏡トマト・月影かぶ・銀の苺・硝子豆は、ここだけで育つ。'],
  noren:['暖簾分け', '「施設」タブの<b>のれん</b>から。暖簾分けをすると、<b>図鑑・実績・博物館の展示</b>と<b>装備1つ</b>だけを持って、新しい宵闇亭を最初から始める。<br>もらえる<b>のれん☆</b>で、値打ち・作物の育ち・従業員・落とし物・支度金・目標をとばす・レシピの覚え直し・旅の美食家を永久に強くできる。周回ごとに魔物は強く、落とし物は多くなる。'],
});
MAN.push({k:'mirror', t:'異界の門（鏡の町ウラヤミ・鏡の畑・鏡の回廊）', c:() => unl('mirror'), h:() => li([
  '目標「王国を復興し、5つの町の評判をLv3にしよう」で解放。旧市街の王城の門をタップ → 鏡をくぐる（1時間）。',
  '<b>鏡の町ウラヤミ</b>：屋台（蜜と砂糖の店・鏡の魚屋・逆さ八百屋・鏡の酒屋）、逆さ食堂でレシピ12品、鏡の商館（交易所）、宿「うたかた」、自分の屋台。好まれる＝鏡の向こうの食材の料理×1.35、ウラヤミの料理×1.6。',
  '<b>鏡の畑</b>（うつしの姿見から）：8区画。鏡トマト（4時間）・月影かぶ（3時間）・銀の苺（6時間）・硝子豆（2.5時間）。収穫で町の評判も少し上がる。',
  '<b>鏡の回廊</b>（うつしの姿見から）：全20階＋最奥「裏の厨房」。魔物 ' + DGD.mirror.mons.map(k => MONT[k].n).join('・') + '。最後のボス<b>鏡の店主</b>（もう一人のあなた）。倒すと鏡の回廊の料理帖7品、ボスの武器・指輪。目標「鏡の店主を倒そう」で暖簾分けが解放。'])});
MAN.push({k:'noren', t:'暖簾分け・のれん☆', c:() => unl('noren') || nrN() > 0, h:() => li([
  '「施設」タブの「🏮 のれん」から。',
  '<b>残る物</b>：図鑑（料理・食材・魔物・装備・牧場・日記）・実績と称号・博物館の展示・完全攻略率のごほうび・チュートリアルと設定・好きな装備1つ。<b>なくなる物</b>：レシピ（覚え直し）・お金・建物・従業員・畑・仲間・牧場の魔物など。',
  '<b>のれん☆</b>＝基本8＋完全攻略率10%ごとに3＋売上合計（最大30）＋鏡の店主を倒した回数×3（最大15）＋これまでの暖簾分け×3。',
  '<b>強化</b>：' + NR_UP.map(u => `${u.n}（${u.d}、最大Lv${u.max}）`).join('・') + '。値段は☆（基本×次のLv）。',
  '<b>周回</b>：何度でもできる。周回ごとに迷宮・ダンジョンの魔物の体力+25%・攻撃+15%（5周目で打ち止め）、落とし物+30%。のれんの色が1色ずつ増える（' + NR_COL.map(c => c[0]).join('・') + '）。'])});
ACH.push({id:'mr1', n:'鏡の向こうの料理人', d:'鏡の店主を倒す', c:s => !!(s.dg && s.dg.kb && s.dg.kb.mirror > 0), r:100000},
  {id:'nr1', n:'のれんを分けた者', d:'暖簾分けをする', c:s => !!(s.nr && s.nr.n >= 1), r:50000}, {id:'nr5', n:'五代目の主', d:'暖簾分けを5回する', c:s => !!(s.nr && s.nr.n >= 5), r:300000});

// ====================================================== v0.48: 自由配置・勲章・遠征隊・オリジナル料理の注文
const fmtGM = m => { m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60); return h ? h + '時間' + (m % 60 ? (m % 60) + '分' : '') : m + '分'; };
// ----- 自由配置の飾り
const PLC = [["bench", "木のベンチ", "out", "nature", 20, 12], ["flowerbed", "丸い花壇", "out", "nature", 18, 12], ["streetlamp", "街灯", "out", "night", 8, 24], ["menuboard", "メニューの黒板", "out", "cute", 12, 16], ["barrelplant", "樽のプランター", "out", "nature", 12, 14], ["catstatue2", "猫の石像", "out", "cute", 12, 14], ["parasol", "パラソル席", "out", "cute", 22, 22], ["topiary", "丸い植木", "out", "nature", 12, 18], ["lantern_st", "石灯籠", "out", "night", 10, 18], ["scarecrow2", "かかし", "farm", "nature", 14, 20], ["windmill", "小さな風車", "farm", "nature", 16, 24], ["beehive", "巣箱", "farm", "nature", 10, 14], ["flowerarch", "花のアーチ", "farm", "cute", 22, 22], ["woodfence", "木の柵", "farm", "nature", 20, 10], ["well2", "小さな井戸", "farm", "nature", 16, 18], ["pumpkins", "かぼちゃの山", "farm", "cute", 16, 12], ["bigplant", "大きな観葉植物", "in", "nature", 12, 20], ["bookshelf", "本棚", "in", "night", 16, 22], ["roundtable", "小さな丸テーブル", "in", "cute", 14, 12], ["barrels", "酒樽の山", "in", "knight", 18, 16], ["winerack", "ワインラック", "in", "night", 16, 20], ["candelabra", "燭台", "in", "night", 10, 18], ["weaponrack", "武器立て", "guild", "knight", 16, 18], ["banner2", "冒険者の旗", "guild", "knight", 10, 24], ["dummy", "訓練人形", "guild", "knight", 12, 20], ["campfire", "たき火", "guild", "night", 14, 12], ["plushie", "魔物のぬいぐるみ", "guild", "cute", 12, 12], ["treasure", "飾りの宝箱", "guild", "knight", 14, 12], ["fern", "鉢植えのシダ", "in", "nature", 14, 16], ["grandclock", "柱時計", "in", "night", 10, 24], ["floorlamp", "フロアランプ", "in", "night", 10, 22], ["crates", "木箱の山", "in", "knight", 16, 14], ["vase", "花瓶の花", "in", "cute", 10, 16], ["easel", "絵のイーゼル", "in", "cute", 14, 20], ["teaset", "お茶の台", "in", "cute", 14, 12], ["umbrella", "傘立て", "in", "nature", 8, 16], ["coatrack", "コート掛け", "in", "night", 10, 22], ["globe", "地球儀", "in", "knight", 12, 16], ["aquarium", "小さな水槽", "in", "nature", 16, 14], ["catbed", "猫のベッド", "in", "cute", 14, 10], ["herbrack", "吊るした香草", "in", "nature", 14, 18], ["spiceshelf", "香辛料の棚", "in", "knight", 14, 18], ["breadbasket", "パンのかご", "in", "cute", 14, 10], ["tapbarrel", "蛇口つきの樽", "in", "knight", 14, 16], ["gramophone", "蓄音機", "in", "night", 14, 16], ["armchair", "ひじ掛け椅子", "in", "night", 14, 14], ["bonsai", "盆栽", "in", "nature", 14, 12], ["sideboard", "皿の飾り棚", "in", "cute", 18, 18], ["sakura", "桜の枝の花瓶", "in", "season", 12, 20], ["koinobori", "こいのぼり", "out", "season", 18, 24], ["tanabata", "七夕の笹", "out", "season", 14, 24], ["windchime", "風鈴の台", "in", "season", 10, 18], ["sunflower", "ひまわりの鉢", "out", "season", 10, 20], ["jackolantern", "かぼちゃのランタン", "out", "season", 12, 12], ["tsukimi", "お月見の台", "in", "season", 14, 16], ["maplepot", "紅葉の鉢", "out", "season", 14, 18], ["snowman2", "小さな雪だるま", "out", "season", 12, 16], ["xmastree", "飾りのもみの木", "in", "season", 16, 24], ["kadomatsu", "門松", "out", "season", 14, 22], ["kagami", "鏡餅", "in", "season", 10, 12], ["flowerbox", "花の植木箱", "out", "nature", 18, 10], ["signpost", "道しるべ", "out", "knight", 14, 20], ["mailbox", "郵便受け", "out", "cute", 8, 16], ["gnome", "庭の小人", "out", "cute", 8, 12], ["bicycle", "荷台つき自転車", "out", "cute", 20, 14], ["fountain2", "小さな噴水", "out", "nature", 16, 16], ["wheelbarrow", "手押し車", "farm", "nature", 18, 12], ["haybale", "干し草のロール", "farm", "nature", 16, 12], ["milkcans", "牛乳缶", "farm", "cute", 14, 14], ["birdhouse", "鳥の巣箱", "farm", "cute", 10, 20], ["trough", "水飲みおけ", "farm", "nature", 18, 10], ["swing", "木のブランコ", "farm", "cute", 20, 22], ["slimestatue", "スライムの像", "guild", "rare", 12, 14], ["goldpot", "黄金の鍋の置物", "in", "rare", 14, 12], ["dragonskull", "竜の頭骨", "guild", "rare", 22, 14], ["crystalcandle", "水晶の燭台", "in", "rare", 10, 18], ["krakenarm", "大海魔の足の剥製", "guild", "rare", 14, 22], ["armor", "飾りの全身鎧", "in", "rare", 12, 22], ["fairylamp", "妖精のランタン", "out", "rare", 10, 20], ["moonrabbit", "月の兎の像", "out", "rare", 12, 16], ["phoenixvase", "不死鳥の羽の花瓶", "in", "rare", 10, 18], ["treasurepile", "財宝の山", "guild", "rare", 20, 12]];
const PLCI = {}; PLC.forEach((p, i) => PLCI[p[0]] = {id:p[0], n:p[1], pl:p[2], t:p[3], w:p[4], h:p[5], i});
const PLC_PLACE = {out:{n:'店の外（霧月通り・広場）', sc:['outside'], fx:'客足', per:.01}, farm:{n:'裏の農場', sc:['farm'], fx:'作物の育ち', per:.015}, in:{n:'店内', sc:['interior'], fx:'評判の上がり方', per:.01}, guild:{n:'ギルド前・魔物牧場', sc:['guild', 'mranch'], fx:'遠征隊の持ち帰り', per:.03}};
const PLC_TH = {nature:{n:'自然', c:'#7ac85a', cb:'緑あふれる'}, night:{n:'夜', c:'#e8c060', cb:'夜のあかり'}, cute:{n:'かわいい', c:'#f08ab0', cb:'にぎやかで楽しい'}, knight:{n:'冒険者', c:'#a8b8d8', cb:'冒険者の砦'}, season:{n:'季節', c:'#f0a0c8', cb:'四季のうつろい'}, rare:{n:'珍品', c:'#c8a0f0', cb:'珍品の間'}};
const PLC_RANK = {nature:0, cute:1, night:2, knight:3, season:0, rare:0}, PLC_MAX = 20, PLC_FXN = 8, PLC_COPY = 3;
const plcPrice = p => Math.round((1000 + p.w * p.h * 8) * (p.t === 'season' ? 1.5 : [1, 1.3, 1.7, 2.2][PLC_RANK[p.t]]) / 100) * 100;
// v0.58：季節の飾り（その季節だけ交換所に並ぶ）と珍しい飾り（闘技場メダル）
const PLC_SEASON = {sakura:0, koinobori:0, tanabata:1, windchime:1, sunflower:1, jackolantern:2, tsukimi:2, maplepot:2, snowman2:3, xmastree:3, kadomatsu:3, kagami:3};
const PLC_RARE_C = {slimestatue:12, goldpot:30, dragonskull:25, crystalcandle:15, krakenarm:25, armor:20, fairylamp:15, moonrabbit:18, phoenixvase:22, treasurepile:30};
function plcSt() { if (!S.plc) S.plc = {own:{}, pl:{}}; if (!S.plc.pl) S.plc.pl = {}; return S.plc; }
const plcScene = sc => Object.keys(PLC_PLACE).find(k => PLC_PLACE[k].sc.includes(sc));
const plcList = pk => { const P = plcSt(); return PLC_PLACE[pk].sc.flatMap(sc => P.pl[sc] || []); };
const plcPlaced = id => { const P = plcSt(); let n = 0; for (const sc in P.pl) n += P.pl[sc].filter(o => o.id === id).length; return n; };
const plcFree = id => (plcSt().own[id] || 0) - plcPlaced(id) - (plcEd && plcEd.held === id ? 1 : 0);
const plcTotal = () => { const P = plcSt(); let n = 0; for (const sc in P.pl) n += P.pl[sc].length; return n; };
function plcCombos(pk) { const c = {}; for (const o of plcList(pk)) { const p = PLCI[o.id]; if (p) c[p.t] = (c[p.t] || 0) + 1; } return Object.keys(c).filter(t => c[t] >= 3); }
function plcMul(pk) { if (!S.plc || !unl('place')) return 1; const n = Math.min(PLC_FXN, plcList(pk).length); return 1 + PLC_PLACE[pk].per * n + .03 * Math.min(2, plcCombos(pk).length); }
function plcIc(id, px) { const p = PLCI[id], sc = px / 24; return `<div class="ic" style="width:${p.w * sc}px;height:${p.h * sc}px;margin:${(24 - p.h) * sc / 2}px ${(24 - p.w) * sc / 2}px;background-image:url(${BLOBU.place_ui || (BLOBU.place_ui = b64Blob(A.place_ui))});background-size:${PLC.length * 24 * sc}px ${24 * sc}px;background-position:-${p.i * 24 * sc}px 0;image-rendering:pixelated"></div>`; }
let plcEd = null, plcTab = 'out';
function plcFxHTML(pk) { const n = plcList(pk).length, cb = plcCombos(pk); return `${PLC_PLACE[pk].fx} +${Math.round((plcMul(pk) - 1) * 1000) / 10}%（置いた数 ${n}/${PLC_MAX}・効果は${PLC_FXN}個まで）${cb.length ? '<br>' + cb.map(t => `<b style="color:${PLC_TH[t].c}">✨ 組み合わせ「${PLC_TH[t].cb}」</b>`).join('　') + '（+3%ずつ）' : ''}`; }
function openPlace(fromBar) {
  if (!unl('place')) return gateMsg('place'); tut('place');
  const P = plcSt(), here = plcScene(scene), owned = PLC.filter(p => P.own[p[0]]);
  let html = `<div class="p">ギルドの交換所で手に入れた飾りを、店の外・農場・店内・ギルド前や魔物牧場に自由に置ける。置いた数に応じて小さな効果があり、同じテーマを3つ以上置くと<b>組み合わせ</b>の効果がつく。</div>
    <div class="p">いる場所：<b>${SCENES[scene] ? SCENES[scene].short : scene}</b>${here ? '（ここに置ける）' : '（ここには置けない）'}</div>
    ${here && !fromBar ? '<div class="btn big blu" data-pa="edit">🪑 この場所の配置を変える</div>' : ''}
    <div class="seg">${Object.keys(PLC_PLACE).map(k => `<div class="${plcTab === k ? 'on' : ''}" data-pt="${k}">${PLC_PLACE[k].n.replace(/（.*/, '')}</div>`).join('')}</div>
    <div class="p">${PLC_PLACE[plcTab].n}：${plcFxHTML(plcTab)}</div>`;
  const list = owned.filter(p => p[2] === plcTab);
  html += list.map(p => { const x = PLCI[p[0]], fr = plcFree(x.id), canHere = here === x.pl;
    return `<div class="row">${plcIc(x.id, U * 12)}<div class="t"><b>${x.n}</b><span style="color:${PLC_TH[x.t].c}">${PLC_TH[x.t].n}</span><span>持っている ${P.own[x.id]}・しまってある ${fr}</span></div>${canHere ? `<div class="btn ${fr > 0 ? 'grn' : 'dis'}" data-pp="${x.id}">置く</div>` : ''}</div>`; }).join('') || '<div class="p">この場所の飾りはまだない。冒険者ギルドの受付にある「飾りの交換所」で手に入る。</div>';
  modal('飾りの配置', html, 'place');
  bind('[data-pt]', d => { plcTab = d.pt; openPlace(fromBar); });
  bind('[data-pa=edit]', () => plcEnter(null));
  bind('[data-pp]', d => { if (plcFree(d.pp) <= 0) return; if (plcList(here).length >= PLC_MAX) return toast(`ここに置けるのは${PLC_MAX}個まで`); plcEnter(d.pp); });
}
function plcEnter(held) { if (!plcScene(scene)) return toast('ここには飾りを置けない'); closeModal(); if (!plcEd) plcEd = {held:null}; plcEd.held = held || null; player.path = []; plcBar(); }
function plcBar() {
  let b = $('plcbar'); if (!plcEd) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'plcbar'; $('root').appendChild(b); }
  const h = plcEd.held;
  b.innerHTML = `<div class="pbt">🪑 ${h ? `<b>${PLCI[h].n}</b>を置く場所をタップ` : '置いた飾りをタップすると持ち上げる'}</div><div class="pbb">${h ? `<span data-pb="flip">↔ 向き${plcEd.flip ? '（逆）' : ''}</span><span data-pb="put">しまう</span>` : '<span data-pb="add">飾りを選ぶ</span>'}<span data-pb="done">完了</span></div>`;
  b.querySelectorAll('[data-pb]').forEach(el => el.onpointerdown = e => { e.stopPropagation(); e.preventDefault(); const a = el.dataset.pb;
    if (a === 'done') { plcEd = null; plcBar(); dirty = true; sfx('ok'); } else if (a === 'put') { plcEd.held = null; plcEd.flip = 0; plcBar(); sfx('tick'); } else if (a === 'flip') { plcEd.flip = plcEd.flip ? 0 : 1; plcBar(); sfx('tick'); } else openPlace(true); });
}
function plcTap(x, y) {
  const pk = plcScene(scene); if (!pk) { plcEd = null; return plcBar(); }
  const P = plcSt(), L = P.pl[scene] || (P.pl[scene] = []);
  if (plcEd.held) { const p = PLCI[plcEd.held]; if (p.pl !== pk) return toast('この飾りはここには置けない');
    if (plcList(pk).length >= PLC_MAX) return toast(`ここに置けるのは${PLC_MAX}個まで`);
    const [cx, cy] = clampWalk(scene, x, y); L.push({id:p.id, x:Math.max(p.w / 2, Math.min(144 - p.w / 2, Math.round(cx))), y:Math.round(cy), ...(plcEd.flip ? {f:1} : {})}); plcEd.held = null; plcEd.flip = 0; sfx('pop'); dirty = true;
    S.stat.placed = (S.stat.placed || 0) + 1; plcBar(); const c = plcCombos(pk); if (c.length && !(P.cbSeen || {})[pk + c.join()]) { P.cbSeen = P.cbSeen || {}; P.cbSeen[pk + c.join()] = 1; toast(`✨ 組み合わせ「${c.map(t => PLC_TH[t].cb).join('・')}」！ ${PLC_PLACE[pk].fx}がさらに上がった`, 3500); } return; }
  const o = L.slice().reverse().find(o => { const p = PLCI[o.id]; return p && Math.abs(o.x - x) <= p.w / 2 + 2 && y >= o.y - p.h - 2 && y <= o.y + 3; });
  if (o) { L.splice(L.indexOf(o), 1); plcEd.held = o.id; plcEd.flip = o.f ? 1 : 0; sfx('tick'); dirty = true; plcBar(); }
}
function plcDraw() {
  if (!S.plc || !unl('place') || !IMG.place) return []; const L = S.plc.pl[scene], out = [];
  if (L) for (const o of L) { const p = PLCI[o.id]; if (!p) continue;
    out.push({y:o.y, f:() => { const x0 = Math.round(o.x - p.w / 2), y0 = o.y - p.h + 1; if (o.f) { ctx.save(); ctx.translate(x0 + p.w, y0); ctx.scale(-1, 1); ctx.drawImage(IMG.place, p.i * 24, 0, p.w, p.h, 0, 0, p.w, p.h); ctx.restore(); } else ctx.drawImage(IMG.place, p.i * 24, 0, p.w, p.h, x0, y0, p.w, p.h);
      if ((p.id === 'streetlamp' || p.id === 'lantern_st' || p.id === 'candelabra' || p.id === 'campfire') && typeof isNight === 'function' && isNight()) { const g = ctx.createRadialGradient(o.x, y0 + 4, 1, o.x, y0 + 4, 18); g.addColorStop(0, 'rgba(255,210,120,.25)'); g.addColorStop(1, 'rgba(255,210,120,0)'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(o.x - 18, y0 - 14, 36, 36); ctx.restore(); }
      if (plcEd) { ctx.strokeStyle = 'rgba(232,192,96,.75)'; ctx.lineWidth = 1; ctx.strokeRect(x0 - .5, y0 - .5, p.w + 1, p.h + 1); } }}); }
  return out;
}
function openPlcShop() {
  if (!unl('place')) return gateMsg('place'); tut('place'); const P = plcSt(), r = guildState().rank;
  let html = `<div class="p">受付のリナ「冒険者の皆さんが旅先から持ち帰った品を、飾りとしてお分けしています。ランクが上がると並ぶ品が増えますよ」<br>同じ飾りは${PLC_COPY}個まで。<b>季節の飾り</b>はその季節だけ並ぶ（今は${SEASONS[seasonIdx()].n}）。<b>珍しい飾り</b>は酒場の闘技場メダルの交換所で。買った飾りは「施設」の「🪑 飾りを自由に置く」から置ける。</div>
    <div class="seg">${Object.keys(PLC_PLACE).map(k => `<div class="${plcTab === k ? 'on' : ''}" data-pt="${k}">${PLC_PLACE[k].n.replace(/（.*/, '')}</div>`).join('')}</div><div class="p">置く場所：${PLC_PLACE[plcTab].n}／効果：${PLC_PLACE[plcTab].fx} +${PLC_PLACE[plcTab].per * 100}%ずつ</div>`;
  html += PLC.filter(p => p[2] === plcTab && p[3] !== 'rare' && (p[3] !== 'season' || PLC_SEASON[p[0]] === seasonIdx())).map(p => { const x = PLCI[p[0]], c = plcPrice(x), lk = PLC_RANK[x.t] > r, n = P.own[x.id] || 0;
    return `<div class="row" style="${lk ? 'opacity:.55' : ''}">${plcIc(x.id, U * 12)}<div class="t"><b>${x.n}</b><span style="color:${PLC_TH[x.t].c}">${PLC_TH[x.t].n}のテーマ</span><span>${lk ? `ギルドのランク${GUILD_RN[PLC_RANK[x.t]]}から` : `持っている ${n}/${PLC_COPY}`}</span></div>${lk ? '' : `<div class="btn ${S.gold >= c && n < PLC_COPY ? '' : 'dis'}" data-pb2="${x.id}">交換<br>${fmt(c)}G</div>`}</div>`; }).join('');
  modal('飾りの交換所', html, 'plcshop');
  bind('[data-pt]', d => { plcTab = d.pt; openPlcShop(); });
  bind('[data-pb2]', d => { const x = PLCI[d.pb2], c = plcPrice(x); if (S.gold < c || (P.own[x.id] || 0) >= PLC_COPY || PLC_RANK[x.t] > guildState().rank) return; S.gold -= c; P.own[x.id] = (P.own[x.id] || 0) + 1; sfx('coin'); dirty = true; toast(`${x.n}を手に入れた！「施設」の「🪑 飾りを自由に置く」から置ける`, 3000); openPlcShop(); });
}
// ----- 勲章
const MEDAL = [
  {k:'cook', n:'料理', v:() => Object.keys(S.known.r).length, u:'種類のレシピを見つける', th:[30, 120, 350, 700], fx:'料理の価値', per:.01},
  {k:'adv', n:'冒険', v:() => totalKills(), u:'体の魔物を倒す', th:[100, 600, 3000, 10000], fx:'迷宮での攻撃', per:.03},
  {k:'fish', n:'釣り', v:() => S.stat.fished || 0, u:'匹釣る', th:[30, 200, 800, 3000], fx:'珍しい魚の出やすさ', per:.15},
  {k:'farm', n:'農業', v:() => S.stat.harvested || 0, u:'個収穫する', th:[100, 800, 4000, 15000], fx:'作物の育ち', per:.03},
  {k:'trade', n:'商い', v:() => S.stat.sold || 0, u:'皿売る', th:[300, 3000, 15000, 60000], fx:'客足', per:.02}];
const MEDAL_TN = ['銅', '銀', '金', '星'], MEDAL_RW = [3000, 15000, 60000, 250000], MEDAL_TC = ['#d89060', '#d8e0e8', '#f0d060', '#c8a8ff'];
const MEDALI = {}; MEDAL.forEach((m, i) => MEDALI[m.k] = Object.assign({i}, m));
const medalT = k => (S && S.medal && unl('medal') && S.medal[k]) || 0;
const medalMul = k => 1 + MEDALI[k].per * medalT(k);
const medalCount = () => MEDAL.reduce((a, m) => a + medalT(m.k), 0);
function medalIc(k, t, px) { const i = MEDALI[k].i * 4 + Math.max(0, t), sc = px / 18; return `<div class="ic" style="width:${16 * sc}px;height:${px}px;background-image:url(${BLOBU.medals || (BLOBU.medals = b64Blob(A.medals))});background-size:${320 * sc}px ${px}px;background-position:-${i * 16 * sc}px 0;image-rendering:pixelated;${t < 0 ? 'filter:brightness(0) opacity(.45)' : ''}"></div>`; }
function medalCheck() {
  if (!unl('medal')) return; if (!S.medal) S.medal = {}; const got = [];
  for (const m of MEDAL) { const v = m.v(); let t = S.medal[m.k] || 0; while (t < 4 && v >= m.th[t]) { t++; S.gold += MEDAL_RW[t - 1]; got.push([m, t]); } S.medal[m.k] = t; }
  if (!got.length) return; dirty = true;
  const h = `<div class="tth">🏅 勲章を授かった！</div><div class="ttx">${got.map(([m, t]) => `<div style="display:flex;align-items:center;gap:${U * 1.5}px">${medalIc(m.k, t - 1, U * 12)}<span><b>${m.n}の${MEDAL_TN[t - 1]}勲章</b>（+${fmt(MEDAL_RW[t - 1])}G）<br>${m.fx} +${Math.round(m.per * t * 100)}%</span></div>`).join('')}</div>`;
  if (simulating) news(h); else { popStory(h); sfx('ok'); }
}
function medalHTML() {
  if (!unl('medal')) return '';
  return `<div class="h">🏅 勲章（${medalCount()}/20）</div><div class="p">5つの分野の記録で、銅・銀・金・星の勲章が授けられる。段階ごとにお金と、その分野の効果がもらえる（ずっと続く）。</div>` + MEDAL.map(m => { const t = medalT(m.k), v = m.v(), nx = t < 4 ? m.th[t] : null;
    return `<div class="row">${medalIc(m.k, t ? t - 1 : 0, U * 13).replace('class="ic" style="', t ? 'class="ic" style="' : 'class="ic" style="filter:brightness(0) opacity(.4);')}<div class="t"><b>${m.n}　<span style="color:${t ? MEDAL_TC[t - 1] : 'var(--sub)'}">${t ? MEDAL_TN[t - 1] + '勲章' : 'まだない'}</span></b><span>${nx ? `次の${MEDAL_TN[t]}勲章：${fmt(v)}/${fmt(nx)}${m.u}` : '最高の星勲章！'}<br>効果：${m.fx} +${Math.round(m.per * t * 100)}%</span>${nx ? `<div class="bar"><i style="width:${Math.min(100, v / nx * 100)}%"></i></div>` : ''}</div></div>`; }).join('') + '<div class="h">🏆 実績</div>';
}
// ----- 遠征隊（牧場の魔物と仲間を送り出す）
const SQ_DUR = [[120, '2時間'], [360, '6時間'], [720, '半日']], SQ_TEAMS = 3, SQ_MEM = 3;
function sqDests() {
  const out = [{k:'mine1', n:'地下迷宮（浅い層）', ic:'⛏', d:'鉱石・魔物の素材・洞窟の採集物', L:[0, 1, 2], req:0, ok:() => unl('mine')},
    {k:'mine2', n:'地下迷宮（深い層）', ic:'🕳', d:'宝石・深い層の魔物の素材', L:[3, 4, 5, 6, 7].filter(i => i < LAYERS.length), req:30, ok:() => mineState().max >= 30, lk:'迷宮のB30にたどり着くと行ける'}];
  DG_KEYS.forEach((k, i) => out.push({k:'dg:' + k, n:DGD[k].n, ic:DGD[k].ic, d:`${TOWNC[DGD[k].town] ? TOWNC[DGD[k].town].n : ''}のダンジョンの素材${'（ボスを倒すと、まれにボスの素材）'}`, dg:k, req:40 + 12 * i, ok:() => !!(S.dg && ((S.dg.best || {})[k] || (S.dg.kb || {})[k])), lk:'一度入ったダンジョンに行ける'}));
  return out;
}
const sqDest = k => sqDests().find(d => d.k === k);
function sqSt() { if (!S.sq) S.sq = {t:[], n:0, log:[]}; return S.sq; }
const sqBusy = w => sqSt().t.some(T => T.who.includes(w));
function sqLv(w) { if (w[0] === 'm') { const m = mrById(+w.slice(2)); return m ? m.lv * (1 + .25 * (m.evo || 0)) : 0; } return 10 + 6 * cpLv(w.slice(2)); }
function sqName(w) { if (w[0] === 'm') { const m = mrById(+w.slice(2)); return m ? mrName(m.k) : '（いない魔物）'; } return CPD[w.slice(2)] ? CPD[w.slice(2)].n : w; }
function sqIc(w, px) { if (w[0] === 'm') { const m = mrById(+w.slice(2)); return m ? mrIcHTML(m, px) : ''; } return cpPortrait(w.slice(2), px); }
const sqPow = who => .6 + .4 * who.length + who.reduce((a, w) => a + sqLv(w), 0) / 60;
function sqPool(D) {
  const pool = {}, ad = (id, w) => { if (INGI[id] !== undefined) pool[id] = (pool[id] || 0) + w; };
  if (D.L) for (const i of D.L) { const L = LAYERS[i]; if (!L) continue; for (const [k, w] of Object.entries(L.rocks || {})) if (k !== 'stone') ad(k, w / 4); (L.forage || []).forEach(id => ad(id, 4)); (L.mons || []).forEach(k => (MONT[k] && MONT[k].drop || []).forEach(([id]) => ad(id, 5))); }
  if (D.dg) { const G = DGD[D.dg]; (G.mats || []).forEach(id => ad(id, 10)); (G.mons || []).forEach(k => (MONT[k] && MONT[k].drop || []).forEach(([id]) => ad(id, 3))); if (S.dg && (S.dg.kb || {})[D.dg] && G.bm) ad(G.bm, .4); }
  return Object.entries(pool).map(([id, w]) => ({id, w}));
}
function sqXp(m, n) { if (!m || m.lv >= 40) return; m.xp = (m.xp || 0) + n; while (m.lv < 40 && m.xp >= famXpNeed(m.lv)) { m.xp -= famXpNeed(m.lv); m.lv++; const ev = m.lv >= 30 ? 2 : m.lv >= 15 ? 1 : 0; if (ev > (m.evo || 0)) m.evo = ev; } }
function sqReturn(T) {
  const D = sqDest(T.dest) || sqDests()[0], pool = sqPool(D), got = {}, rolls = Math.max(1, Math.round(T.dur / 40 * T.pow * plcMul('guild')));
  for (let i = 0; i < rolls && pool.length; i++) { const id = wpick(pool).id; got[id] = (got[id] || 0) + 1; }
  for (const id in got) { add(S.inv, id, got[id]); S.known.i[id] = true; }
  const gold = Math.round(T.dur * T.pow * 4 * (D.dg ? 4 : D.k === 'mine2' ? 2 : 1)); S.gold += gold; S.stat.earned = (S.stat.earned || 0) + gold;
  for (const w of T.who) { if (w[0] === 'm') { const m = mrById(+w.slice(2)); if (m) sqXp(m, Math.round(T.dur / 5)); } else { const C_ = cpSt(), k = w.slice(2); C_.hp[k] = Math.min(100, (C_.hp[k] || 0) + 1); } }
  const Q = sqSt(); Q.n++; S.stat.sqDone = (S.stat.sqDone || 0) + 1;
  const txt = `${T.who.map(sqName).join('・')}が「${D.n}」から帰ってきた！<br>${Object.entries(got).map(([id, n]) => `${ingName(id)}×${n}`).join('・')}（倉庫へ）　+${fmt(gold)}G`;
  Q.log.unshift({d:gday(), txt}); Q.log = Q.log.slice(0, 12);
  if (simulating) news(`<div class="tth">🧭 遠征隊（留守中）</div><div class="ttx">${txt}</div>`); else toast('🧭 ' + txt, 5000);
}
function sqTick() { if (!S.sq || !S.sq.t.length) return; const done = S.sq.t.filter(T => S.t >= T.end); if (!done.length) return; S.sq.t = S.sq.t.filter(T => S.t < T.end); done.forEach(sqReturn); dirty = true; }
let sqDraft = null;
function openSquad() {
  if (!unl('expd')) return gateMsg('expd'); tut('expd'); const Q = sqSt(), R = mrSt(), C_ = cpSt();
  if (!sqDraft) sqDraft = {who:[], dest:'mine1', dur:120};
  sqDraft.who = sqDraft.who.filter(w => !sqBusy(w) && (w[0] === 'm' ? !!mrById(+w.slice(2)) : !!C_.j[w.slice(2)]));
  const cands = [...mrAll().filter(m => m.id !== R.fam).map(m => 'm:' + m.id), ...CP_KEYS.filter(k => C_.j[k]).map(k => 'c:' + k)];
  const run = Q.t.map(T => { const D = sqDest(T.dest) || {n:T.dest, ic:'?'}, left = T.end - S.t, pr = 1 - left / T.dur;
    return `<div class="row"><div class="calev">${D.ic}</div><div class="t"><b>${D.n}</b><span>${T.who.map(sqName).join('・')}　あと${fmtGM(left)}</span><div class="bar"><i style="width:${Math.max(0, Math.min(100, pr * 100))}%"></i></div></div></div>`; }).join('');
  const lv = sqDraft.who.reduce((a, w) => a + sqLv(w), 0), D0 = sqDest(sqDraft.dest);
  const ok = sqDraft.who.length && Q.t.length < SQ_TEAMS && D0 && D0.ok() && lv >= D0.req;
  const html = `<div class="p">牧場の魔物（使い魔以外）や冒険の仲間を、遠征隊として送り出す。決めた時間がたつと、行き先の素材とお金を持ち帰る（留守中も進む）。魔物は経験を積み、仲間は♥が少し上がる。ギルド前・魔物牧場に飾りを置くと持ち帰りが増える。</div>
    <div class="h">出かけている遠征隊（${Q.t.length}/${SQ_TEAMS}）</div>${run || '<div class="p">いまは誰も出かけていない。</div>'}
    ${Q.t.length < SQ_TEAMS ? `<div class="h">新しい遠征隊（${sqDraft.who.length}/${SQ_MEM}人・合計Lv${Math.round(lv)}）</div>
    <div class="grid">${cands.map(w => { const busy = sqBusy(w), on = sqDraft.who.includes(w); return `<div class="cell ${on ? 'sel' : ''} ${busy ? 'dim' : ''}" data-sw="${w}" style="flex-direction:column;height:auto;padding:2px 0">${sqIc(w, U * 9)}<span style="font-size:${U * 2.8}px;line-height:1.1;text-align:center">${sqName(w).slice(0, 6)}<br>${busy ? '遠征中' : 'Lv' + Math.round(sqLv(w))}</span></div>`; }).join('') || '<div class="p">送り出せる魔物や仲間がいない。</div>'}</div>
    <div class="h">行き先</div>${sqDests().map(D => { const o = D.ok(); return `<div class="row ${sqDraft.dest === D.k ? 'sel' : ''}" data-sd="${D.k}" style="${o ? '' : 'opacity:.5'}"><div class="calev">${D.ic}</div><div class="t"><b>${sqDraft.dest === D.k ? '● ' : ''}${D.n}</b><span>${o ? D.d + (D.req ? `<br>合計Lv${D.req}以上` : '') : D.lk}</span></div></div>`; }).join('')}
    <div class="seg">${SQ_DUR.map(([m, n]) => `<div class="${sqDraft.dur === m ? 'on' : ''}" data-su="${m}">${n}</div>`).join('')}</div>
    <div class="btn big grn ${ok ? '' : 'dis'}" data-a="sqgo">🧭 出発する${D0 && lv < D0.req ? `（合計Lv${D0.req}が必要）` : ''}</div>` : ''}
    ${Q.log.length ? '<div class="h">これまでの遠征</div>' + Q.log.map(l => `<div class="p" style="font-size:${U * 3.4}px">${l.txt}</div>`).join('') : ''}`;
  modal('遠征隊', html, 'squad');
  bind('[data-sw]', d => { const w = d.sw; if (sqBusy(w)) return; const i = sqDraft.who.indexOf(w); if (i >= 0) sqDraft.who.splice(i, 1); else if (sqDraft.who.length < SQ_MEM) sqDraft.who.push(w); else return toast(`遠征隊は${SQ_MEM}人まで`); openSquad(); });
  bind('[data-sd]', d => { const D = sqDest(d.sd); if (!D.ok()) return toast(D.lk); sqDraft.dest = d.sd; openSquad(); });
  bind('[data-su]', d => { sqDraft.dur = +d.su; openSquad(); });
  bind('[data-a=sqgo]', () => { const lv2 = sqDraft.who.reduce((a, w) => a + sqLv(w), 0), D = sqDest(sqDraft.dest); if (!sqDraft.who.length || Q.t.length >= SQ_TEAMS || !D || !D.ok() || lv2 < D.req) return;
    for (const w of sqDraft.who) { if (w[0] === 'm') { const m = mrById(+w.slice(2)); if (m) m.job = null; } else if (C_.act === w.slice(2)) { C_.act = null; if (typeof CMP !== 'undefined') CMP = null; } }
    Q.t.push({who:sqDraft.who.slice(), dest:D.k, dur:sqDraft.dur, end:S.t + sqDraft.dur, pow:sqPow(sqDraft.who)}); S.stat.sqSent = (S.stat.sqSent || 0) + 1;
    sfx('ok'); dirty = true; toast(`🧭 遠征隊が「${D.n}」へ出発した（${fmtGM(sqDraft.dur)}）`); sqDraft = null; openSquad(); });
}
// ----- オリジナル料理の注文（常連がオリジナル料理を名指しで頼む）
function ooSt() { if (!S.oo) S.oo = {d:-1, l:[], n:0}; return S.oo; }
function ooRefresh() {
  if (!unl('oorder')) return; const O = ooSt(); if (O.d === gday()) return; O.d = gday();
  O.l = O.l.filter(o => gday() - o.day < 3 && S.creative[o.k]);
  const ks = (S.aiRecs || []).filter(k => S.creative[k] && S.creative[k].ai); if (!ks.length) return;
  const regs = REGS.filter(r => regOf(r.id).aff > 0 || regOf(r.id).lv > 0); if (!regs.length) return;
  const want = Math.min(3, 1 + (ks.length >= 4 ? 1 : 0) + (ks.length >= 10 ? 1 : 0)); let added = 0;
  for (let g = 0; g < 10 && O.l.length < want; g++) { const r = pick(regs), k = pick(ks); if (O.l.some(o => o.r === r.id || o.k === k)) continue; O.l.push({r:r.id, k, day:gday(), n:Math.random() < .3 ? 2 : 1}); added++; }
  if (added && !simulating) { toast(`📝 常連客から、あなたのオリジナル料理の注文が${added}件届いた（オリジナルレシピ図鑑・依頼の掲示板）`, 4000); tut('oorder'); }
}
const ooHave = k => haveDish(k, false) + haveDish(k, true);
function ooHTML() {
  if (!unl('oorder')) return ''; const O = ooSt(); if (!O.l.length) return `<div class="h">📝 オリジナル料理の注文</div><div class="p">いまは注文がない。常連客は毎朝、あなたのオリジナル料理を名指しで頼むことがある（3日で取り下げ）。</div>`;
  return `<div class="h">📝 オリジナル料理の注文</div><div class="p">常連客が、あなたのオリジナル料理を名指しで頼んでいる。届けると値打ちの2.5倍と、♥が多めに上がる。</div>` + O.l.map((o, i) => { const c = S.creative[o.k], r = REGI[o.r], h = ooHave(o.k);
    return `<div class="row">${dishIcHTML(o.k, U * 11)}<div class="t"><b>${c.name} ×${o.n}</b><span>${r.name}より　報酬 ${fmt(dval(o.k) * o.n * 2.5)}G・♥　手持ち ${h}　あと${3 - (gday() - o.day)}日</span></div><div class="btn ${h >= o.n ? 'grn' : 'dis'}" data-oo="${i}">届ける</div></div>`; }).join('');
}
function ooBind(re) { bind('[data-oo]', d => { const O = ooSt(), o = O.l[+d.oo]; if (!o || ooHave(o.k) < o.n) return; takeDishAny(o.k, o.n);
  const c = S.creative[o.k], p = Math.round(dval(o.k) * o.n * 2.5), r = REGI[o.r], st = regOf(o.r); S.gold += p; S.stat.earned = (S.stat.earned || 0) + p;
  st.aff += 4; while (st.lv < 5 && st.aff >= HEART[st.lv]) { st.lv++; regLevel(r, st.lv); }
  c.sold = (c.sold || 0) + o.n; c.ord = (c.ord || 0) + 1; O.l.splice(+d.oo, 1); O.n++; S.stat.oorder = (S.stat.oorder || 0) + 1; sfx('coin'); dirty = true;
  toast(`${r.name}「これこれ！ この『${c.name}』が食べたかったんだ」<br>+${fmt(p)}G・♥`, 3500); re(); }); }
// ----- 毎時の処理
function v48Tick() {
  if (!simulating && typeof dbRef !== 'undefined' && !dbRef && S.goal >= 5 && S.xrem !== gday() && hmNow() >= 420) { S.xrem = gday(); let t0 = 0; try { t0 = +localStorage.getItem('nk_exp_t') || 0; } catch (e) {} if (Date.now() - t0 > 5 * 864e5) toast('💾 念のため「施設」→「データの引き継ぎ」→「コードを作る」で、セーブのコードをメモに保存しておこう（5日に1回がおすすめ）', 6000); }
  if (S.sq) sqTick();
  if (unl('oorder') && (!S.oo || S.oo.d !== gday()) && hmNow() >= 360) ooRefresh();
  if (unl('medal') && (S.medalT === undefined || Math.abs(S.t - S.medalT) >= 30)) { S.medalT = S.t; medalCheck(); }
}
Object.assign(UNL, {
  place:{n:'飾りの自由配置', i:'🪑', d:'冒険者ギルドの受付に「飾りの交換所」ができた。手に入れた飾りを、店の外・農場・店内・ギルド前や魔物牧場の好きな場所に置ける（「施設」の「🪑 飾りを自由に置く」）。', tut:'place'},
  medal:{n:'勲章', i:'🏅', d:'料理・冒険・釣り・農業・商いの5つの分野で、記録に応じて銅・銀・金・星の勲章が授けられるようになった（図鑑の「実績」タブ）。', tut:'medal'},
  oorder:{n:'オリジナル料理の注文', i:'📝', d:'常連客が、あなたのオリジナル料理を名指しで注文するようになった。オリジナルレシピ図鑑と依頼の掲示板から届けられる。', tut:'oorder'},
  expd:{n:'遠征隊', i:'🧭', d:'牧場の魔物や冒険の仲間を「遠征隊」として迷宮やダンジョンへ送り出せるようになった。時間がたつと素材を持ち帰る（留守中も）。魔物牧場とギルドの受付から。', tut:'expd'},
});
Object.assign(TUT, {
  place:['飾りの自由配置', '<b>手に入れ方</b>：冒険者ギルドの受付の<b>「飾りの交換所」</b>（ランクで品が増える）。<br><b>置き方</b>：「施設」の<b>「🪑 飾りを自由に置く」</b>で飾りを選び、画面の好きな場所をタップ。置いた飾りをタップすると持ち上げて動かせる。「しまう」で片づけ、「完了」で終わる。<br><b>効果</b>：店の外＝客足、農場＝作物の育ち、店内＝評判の上がり方、ギルド前・魔物牧場＝遠征隊の持ち帰り。同じテーマ（自然・夜・かわいい・冒険者）を3つ以上置くと<b>組み合わせ</b>で+3%。'],
  medal:['勲章', '料理（見つけたレシピ）・冒険（倒した魔物）・釣り・農業（収穫）・商い（売った皿）の5分野。記録がたまると<b>銅→銀→金→星</b>の勲章が自動で授けられ、お金と、その分野のずっと続く効果がもらえる。<br>図鑑の<b>「実績」</b>タブの上で進み具合が見られる。'],
  oorder:['オリジナル料理の注文', '仲良くなった常連客が、試作台で作った<b>あなたのオリジナル料理</b>を名指しで頼むことがある（毎朝・3日で取り下げ）。<br>その料理を作り置きして、<b>オリジナルレシピ図鑑</b>か<b>依頼の掲示板</b>から届ける。報酬は値打ちの2.5倍と♥。オリジナル料理が多いほど注文も増える。'],
  expd:['遠征隊', '魔物牧場や冒険者ギルドの受付の<b>「🧭 遠征隊」</b>から。<br>①牧場の魔物（使い魔以外）や仲間を1〜3人選ぶ ②行き先（迷宮の浅い層・深い層・入ったことのあるダンジョン）を選ぶ ③時間（2時間・6時間・半日）を選んで出発。<br>合計Lvが高いほど、長いほど、たくさん持ち帰る。遠征中の仲間は迷宮に連れて行けない。同時に3隊まで。'],
});
ACH.push({id:'pl1', n:'飾りつけ名人', d:'飾りを10個置く', c:s => !!s.plc && Object.values(s.plc.pl || {}).reduce((a, l) => a + l.length, 0) >= 10, r:30000},
  {id:'md1', n:'勲章の主', d:'勲章を合わせて10段階', c:s => !!s.medal && Object.values(s.medal).reduce((a, b) => a + b, 0) >= 10, r:80000},
  {id:'md2', n:'五つ星の英雄', d:'5分野すべてで星勲章', c:s => !!s.medal && MEDAL.every(m => (s.medal[m.k] || 0) >= 4), r:500000},
  {id:'sq1', n:'遠征隊長', d:'遠征隊を20回送り出す', c:s => (s.stat.sqSent || 0) >= 20, r:50000},
  {id:'oo1', n:'ご指名の料理人', d:'オリジナル料理の注文に10回応える', c:s => (s.stat.oorder || 0) >= 10, r:50000});
MAN.push({k:'place', t:'飾りの自由配置', c:() => unl('place'), h:() => li(['<b>手に入れ方</b>：冒険者ギルドの受付の「🪑 飾りの交換所」。テーマ（自然・かわいい・夜・冒険者）ごとに、ギルドのランクF・E・D・Cから並ぶ。同じ飾りは3個まで。全28種。',
  '<b>置き方</b>：「施設」タブの「🪑 飾りを自由に置く」→「置く」→ 画面の好きな場所をタップ。置いた飾りをタップすると持ち上げて動かせる。「しまう」で片づけ、「完了」で終わる。1つの場所に20個まで。通るのをじゃましない。',
  '<b>効果</b>（置いた数8個まで）：店の外＝客足+1%ずつ／農場＝作物の育ち+1.5%ずつ／店内＝評判の上がり方+1%ずつ／ギルド前・魔物牧場＝遠征隊の持ち帰り+3%ずつ。',
  '<b>組み合わせ</b>：同じ場所に同じテーマを3つ以上置くと「緑あふれる」「夜のあかり」などの組み合わせになり、その場所の効果+3%（2つまで）。夜は街灯・石灯籠・燭台・たき火に明かりがともる。'])});
MAN.push({k:'medal', t:'勲章', c:() => unl('medal'), h:() => li(['5つの分野の記録で、銅・銀・金・星の勲章が自動で授けられる。図鑑の「実績」タブの上で進み具合が見られる。',
  MEDAL.map(m => `<b>${m.n}</b>：${m.th.map(fmt).join('・')}${m.u}／効果 ${m.fx} +${Math.round(m.per * 100)}%ずつ`).join('<br>'),
  `ごほうび：銅 ${fmt(MEDAL_RW[0])}G・銀 ${fmt(MEDAL_RW[1])}G・金 ${fmt(MEDAL_RW[2])}G・星 ${fmt(MEDAL_RW[3])}G。`])});
MAN.push({k:'expd', t:'遠征隊', c:() => unl('expd'), h:() => li(['魔物牧場の「🧭 遠征隊」か、冒険者ギルドの受付から。牧場の魔物（使い魔以外）と冒険の仲間を1〜3人選んで送り出す。同時に3隊まで。',
  '<b>行き先</b>：地下迷宮の浅い層（いつでも）・深い層（迷宮B30到達・合計Lv30以上）・入ったことのある専用ダンジョン（合計Lv40〜）。ボスを倒したダンジョンでは、まれにボスの素材も。',
  '<b>時間</b>：2時間・6時間・半日。持ち帰る数＝時間×隊の強さ（人数と合計Lv）。お金も少し。留守中も進み、帰ると自動で倉庫へ。',
  '魔物は経験を積んでLvが上がり（Lv15・30で進化）、仲間は♥が少し上がる。遠征中の仲間は迷宮に連れて行けず、遠征中の魔物は使い魔にできない。'])});
MAN.push({k:'oorder', t:'オリジナル料理の注文', c:() => unl('oorder'), h:() => li(['仲良くなった常連客が、試作台で作ったあなたのオリジナル料理を名指しで注文する（毎朝6時に届く・3日で取り下げ）。',
  'オリジナル料理が4品以上で1日2件、10品以上で3件まで。オリジナルレシピ図鑑か依頼の掲示板の「届ける」で渡す。報酬は値打ちの2.5倍と♥4。'])});
MAN_CAT[1][1].push('place', 'oorder'); MAN_CAT[3][1].push('medal', 'expd');

// ====================================================== v0.49: 建物・木・街灯の当たり判定と立体感（奥に入ると隠れる）
const OCC3D = {"capital":[{"b":158,"s":[["p",[0,155],[15,155],[7.5,120]],["r",6.5,154,8.5,158]]},{"b":152,"s":[["p",[57,149],[73,149],[65.0,114]],["r",64.0,148,66.0,152]]},{"b":150,"s":[["p",[103,146],[125,146],[114,106]]]},{"b":209,"s":[["r",57,174,63,209]]},{"b":208,"s":[["r",93,174,99,208]]},{"b":207,"s":[["e",28,186,9,9],["e",28,199,11,8]]},{"b":208,"s":[["p",[127,205],[143,205],[135.0,172]],["r",134.0,204,136.0,208]]}],"port":[{"b":168,"s":[["r",24,136,35,160]]},{"b":212,"s":[["r",54,188,60,212]]},{"b":212,"s":[["r",100,188,106,212]]}],"desert":[{"b":192,"s":[["e",12.0,129.0,12.0,13.0],["r",7,139,12,192]]},{"b":150,"s":[["e",64.0,128.0,14.0,12.0],["r",60,137,66,150]]},{"b":210,"s":[["e",132.0,174.0,12.0,10.0],["r",132,181,137,210]]},{"b":222,"s":[["r",64,188,70,222]]},{"b":222,"s":[["r",102,188,108,222]]}],"tea":[{"b":152,"s":[["e",10.0,136.0,10.0,12.0],["r",8.0,146,12.0,152]]},{"b":150,"s":[["p",[54,147],[76,147],[65.0,120]],["r",64.0,146,66.0,150]]},{"b":168,"s":[["r",76,143,100,153],["r",86,152,88,168]]},{"b":208,"s":[["e",8.0,195.0,8.0,9.0],["r",6.0,202,10.0,208]]},{"b":210,"s":[["r",56,184,64,210]]},{"b":208,"s":[["r",92,184,100,208]]}],"isle":[{"b":158,"s":[["e",13.0,129.0,13.0,11.0],["r",6,137,12,158]]},{"b":150,"s":[["e",66.0,128.0,12.0,12.0],["r",60,137,66,150]]},{"b":212,"s":[["e",133.0,183.0,11.0,11.0],["r",134,191,140,212]]},{"b":220,"s":[["e",10.0,196.0,10.0,8.0],["r",4,201,10,220]]},{"b":210,"s":[["r",58,180,64,210]]},{"b":208,"s":[["r",94,180,100,208]]}],"mirror":[{"b":134,"s":[["r",58,106,64,134]]},{"b":134,"s":[["r",90,106,96,134]]},{"b":212,"s":[["r",58,184,64,212]]},{"b":210,"s":[["r",92,182,98,210]]}],"oldtown":[{"b":62,"s":[["e",56.0,52.0,10.0,8.0],["r",54.0,58,58.0,62]]},{"b":126,"s":[["e",54.0,117.0,8.0,7.0],["r",52.0,122,56.0,126]]},{"b":130,"s":[["e",134.0,120.0,8.0,8.0],["r",132.0,126,136.0,130]]},{"b":188,"s":[["e",46.0,178.0,10.0,8.0],["r",44.0,184,48.0,188]]},{"b":262,"s":[["e",92.0,249.0,10.0,9.0],["r",90.0,256,94.0,262]]},{"b":304,"s":[["e",8.0,293.0,8.0,7.0],["r",6.0,298,10.0,304]]},{"b":306,"s":[["e",135.0,294.0,9.0,8.0],["r",133.0,300,137.0,306]]}],"b_river":[{"b":156,"s":[["e",14,135.6,12,7.8],["r",2,135.6,26,150],["r",12,138,16,156]]},{"b":202,"s":[["e",132,181.6,12,7.8],["r",120,181.6,144,196],["r",130,184,134,202]]},{"b":69,"s":[["e",8,53.0,12,9.5],["r",6,58,10,69]]},{"b":63,"s":[["e",138,46.2,13,10.3],["r",136,52,140,63]]},{"b":128,"s":[["e",130,113.8,11,8.7],["r",128,118,132,128]]},{"b":245,"s":[["e",10,229.0,12,9.5],["r",8,234,12,245]]},{"b":270,"s":[["e",136,255.8,11,8.7],["r",134,260,138,270]]},{"b":326,"s":[["e",16,311.8,11,8.7],["r",14,316,18,326]]},{"b":308,"s":[["r",18,292,39,299],["r",29,294,31,308]]}],"b_flower":[{"b":156,"s":[["e",22,137.4,14,11.1],["r",20,144,24,156]]},{"b":80,"s":[["e",8,65.8,11,8.7],["r",6,70,10,80]]},{"b":104,"s":[["e",138,89.8,11,8.7],["r",136,94,140,104]]},{"b":239,"s":[["e",10,223.0,12,9.5],["r",8,228,12,239]]},{"b":204,"s":[["e",136,190.6,10,7.9],["r",134,194,138,204]]},{"b":308,"s":[["e",126,293.8,11,8.7],["r",124,298,128,308]]},{"b":304,"s":[["e",14,290.6,10,7.9],["r",12,294,16,304]]},{"b":308,"s":[["r",18,292,39,299],["r",29,294,31,308]]}],"b_marsh":[{"b":308,"s":[["r",18,292,39,299],["r",29,294,31,308]]},{"b":94,"s":[["r",12,66,16,94],["r",5,66,23,78]]},{"b":142,"s":[["r",126,114,130,142],["r",119,114,137,126]]},{"b":212,"s":[["r",10,184,14,212],["r",3,184,21,196]]},{"b":252,"s":[["r",128,224,132,252],["r",121,224,139,236]]},{"b":32,"s":[["r",118,4,122,32],["r",111,4,129,16]]}],"b_volcano":[{"b":308,"s":[["r",18,292,39,299],["r",29,294,31,308]]},{"b":84,"s":[["r",6,66,21,84]]},{"b":102,"s":[["r",124,84,139,102]]},{"b":174,"s":[["r",10,156,25,174]]},{"b":198,"s":[["r",122,180,137,198]]},{"b":262,"s":[["r",8,244,23,262]]},{"b":288,"s":[["r",126,270,141,288]]},{"b":148,"s":[["r",7,128,9,148],["p",[8,134],[2,128],[8,132]],["p",[8,138],[13,132],[8,136]]]},{"b":68,"s":[["r",135,48,137,68],["p",[136,54],[130,48],[136,52]],["p",[136,58],[141,52],[136,56]]]},{"b":234,"s":[["r",5,214,7,234],["p",[6,220],[0,214],[6,218]],["p",[6,224],[11,218],[6,222]]]},{"b":258,"s":[["r",137,238,139,258],["p",[138,244],[132,238],[138,242]],["p",[138,248],[143,242],[138,246]]]}],"b_snow":[{"b":72,"s":[["p",[-6.6,68],[30.6,68],[12,40]],["r",11,68,13,72]]},{"b":114,"s":[["p",[12.8,110],[43.2,110],[28,88]],["r",27,110,29,114]]},{"b":158,"s":[["p",[-10.6,154],[26.6,154],[8,126]],["r",7,154,9,158]]},{"b":112,"s":[["p",[117.7,108],[150.3,108],[134,84]],["r",133,108,135,112]]},{"b":188,"s":[["p",[120.6,184],[155.4,184],[138,158]],["r",137,184,139,188]]},{"b":242,"s":[["p",[-2.3,238],[30.3,238],[14,214]],["r",13,238,15,242]]},{"b":318,"s":[["p",[114.8,314],[145.2,314],[130,292]],["r",129,314,131,318]]},{"b":96,"s":[["p",[41.0,92],[67.0,92],[54,74]],["r",53,92,55,96]]},{"b":302,"s":[["p",[87.0,298],[113.0,298],[100,280]],["r",99,298,101,302]]},{"b":228,"s":[["r",37,199,55,218],["r",45,208,47,228]]},{"b":212,"s":[["r",95,181,113,200],["r",103,190,105,212]]},{"b":270,"s":[["r",115,243,133,262],["r",123,252,125,270]]},{"b":308,"s":[["r",18,292,39,299],["r",29,294,31,308]]}],"b_moon":[{"b":308,"s":[["r",18,292,39,299],["r",29,294,31,308]]},{"b":82,"s":[["e",15,50.5,18,14.5],["p",[9,80],[11,58],[17,58],[19,80]]]},{"b":104,"s":[["e",133,71.6,19,15.4],["p",[127,102],[129,80],[135,80],[137,102]]]},{"b":214,"s":[["e",11,183.4,17,13.6],["p",[5,212],[7,190],[13,190],[15,212]]]},{"b":254,"s":[["e",135,222.5,18,14.5],["p",[129,252],[131,230],[137,230],[139,252]]]},{"b":330,"s":[["e",123,301.2,15,11.8],["p",[117,328],[119,306],[125,306],[127,328]]]},{"b":318,"s":[["e",21,290.1,14,10.9],["p",[15,316],[17,294],[23,294],[25,316]]]}]};
const BLK3D = {"tea":[[3,72,35,92],[39,72,71,92],[75,72,107,92],[109,72,141,92],[0,208,48,226],[56,206,102,226],[100,194,143,226],[6,147,14,152],[62,145,68,150],[85,163,89,168],[4,203,12,208],[56,205,64,210],[92,203,100,208]],"capital":[[3,72,35,92],[39,72,71,92],[75,72,107,92],[109,72,141,92],[0,203,48,226],[56,206,102,226],[100,194,143,226],[4,153,11,158],[62,147,68,152],[57,204,63,209],[93,203,99,208],[132,203,138,208]],"isle":[[3,72,35,92],[39,72,71,92],[75,72,107,92],[109,72,141,92],[0,208,48,226],[56,194,102,226],[100,190,143,226],[5,153,13,158],[59,145,67,150],[133,207,141,212],[3,215,11,220],[58,205,64,210],[94,203,100,208]],"mirror":[[3,72,35,92],[39,72,71,92],[75,72,107,92],[109,72,141,92],[0,204,48,226],[56,203,102,226],[100,194,143,226],[58,129,64,134],[90,129,96,134],[58,207,64,212],[92,205,98,210]],"desert":[[3,72,35,92],[39,72,71,92],[75,72,107,92],[109,72,141,92],[0,208,48,226],[56,214,102,226],[100,206,143,226],[6,187,13,192],[59,145,67,150],[131,205,138,210],[64,217,70,222],[102,217,108,222]],"port":[[3,108,35,117],[39,108,71,117],[75,108,107,117],[109,108,141,117],[0,206,50,220],[56,212,98,220],[104,206,144,220],[54,207,60,212],[100,207,106,212]],"outside":[[41,123,47,128],[97,169,103,174],[41,207,47,212]],"oldtown":[[52,57,60,62],[50,121,58,126],[130,125,138,130],[42,183,50,188],[88,257,96,262],[4,299,12,304],[131,301,139,306]],"b_river":[[18,66,30,74],[111,61,125,71],[25,120,35,128],[106,136,118,144],[15,210,25,218],[122,224,134,232],[35,282,45,290],[117,302,127,310],[11,151,17,156],[129,197,135,202],[4,64,12,69],[134,58,142,63],[126,123,134,128],[6,240,14,245],[132,265,140,270],[12,321,20,326],[28,304,32,308]],"b_flower":[[18,151,26,156],[4,75,12,80],[134,99,142,104],[6,234,14,239],[132,199,140,204],[122,303,130,308],[10,299,18,304],[28,304,32,308]],"b_marsh":[[28,304,32,308],[12,89,16,94],[126,137,130,142],[10,207,14,212],[128,247,132,252],[118,27,122,32],[93,127,111,132],[21,195,39,200],[109,229,127,234],[15,289,33,294]],"b_volcano":[[28,304,32,308],[14,115,46,125],[98,170,134,182],[26,275,54,285],[6,80,21,84],[124,98,139,102],[10,170,25,174],[122,194,137,198],[8,258,23,262],[126,284,141,288],[6,144,10,148],[134,64,138,68],[4,230,8,234],[136,254,140,258],[58,129,66,132],[76,193,84,196],[26,297,34,300],[108,125,116,128]],"b_snow":[[49,116,59,124],[86,210,98,218],[18,137,26,143],[121,296,131,304],[66,297,74,303],[10,67,14,72],[26,109,30,114],[6,153,10,158],[132,107,136,112],[136,183,140,188],[12,237,16,242],[128,313,132,318],[52,91,56,96],[98,297,102,302],[44,224,48,228],[102,208,106,212],[122,266,126,270],[28,304,32,308]],"b_moon":[[28,304,32,308],[9,76,19,82],[127,98,137,104],[5,208,15,214],[129,248,139,254],[117,324,127,330],[15,312,25,318]]};
const BLK3D_RM = {"desert":[[59,123,74,135]]};
(function () {
  for (const sc in BLK3D) { const d = WALKDEF[sc]; if (!d) continue; const rm = BLK3D_RM[sc] || []; d.blocks = d.blocks.filter(b => !rm.some(r => r.join() === b.join())).concat(BLK3D[sc]); }
  for (const sc in OCC3D) for (const o of OCC3D[sc]) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const ext = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    for (const s of o.s) { if (s[0] === 'r') { ext(s[1], s[2]); ext(s[3], s[4]); } else if (s[0] === 'e') { ext(s[1] - s[3], s[2] - s[4]); ext(s[1] + s[3], s[2] + s[4]); } else s.slice(1).forEach(p => ext(p[0], p[1])); }
    o.bb = [Math.max(0, Math.floor(x0)), Math.max(0, Math.floor(y0)), Math.min(144, Math.ceil(x1)), Math.ceil(y1)]; }
})();
function occDraw(list, bg) {
  const L = OCC3D[scene]; if (!L || !bg || !bg.width) return;
  for (const o of L) list.push({y:o.b - .01, f:() => { const B = o.bb, w = B[2] - B[0], h = Math.min(bg.height, B[3]) - B[1]; if (w <= 0 || h <= 0) return;
    ctx.save(); ctx.beginPath();
    for (const s of o.s) { if (s[0] === 'r') ctx.rect(s[1], s[2], s[3] - s[1], s[4] - s[2]); else if (s[0] === 'e') { ctx.moveTo(s[1] + s[3], s[2]); ctx.ellipse(s[1], s[2], s[3], s[4], 0, 0, Math.PI * 2); } else { const p = s.slice(1); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); } }
    ctx.clip(); ctx.drawImage(bg, B[0], B[1], w, h, B[0], B[1], w, h); ctx.restore(); }});
}

const layerOf = f => Math.min(5, Math.floor((f - 1) / 10));
const FERTS = new Set(['fert1','fert2','fert3']);
let FL = null; // current floor (not saved; regenerated)
function mineState() { if (!S.mine) S.mine = {max:0, ever:{}, hp:100, st:100, hpMax:100, stMax:100, floor:0, trip:{}, buff:{}, donated:{}, hpL:0}; if (S.mine.hpL === undefined) { S.mine.hpL = Math.max(0, Math.min(5, Math.floor((S.mine.max - 1) / 10))); S.mine.hpMax += 15 * S.mine.hpL; } for (const k of ['ever','trip','buff','donated']) if (!S.mine[k]) S.mine[k] = {}; return S.mine; }
function genFloor(f) {
  const M = mineState(), L = LAYERS[layerOf(f)];
  const fl = {f, rocks:[], mons:[], ladder:null, broken:0, special:null, elevator:f % 5 === 0, lake:null, chest:null, lava:layerOf(f) === 2};
  const r = Math.random();
  if (f % 5 === 0) fl.special = 'cp'; else if (r < .08) fl.special = 'chest'; else if (r < .2 && layerOf(f) >= 1 && layerOf(f) <= 3) fl.special = 'lake'; else if (r < .28) fl.special = 'nest'; else if (r < .36) fl.special = 'vein';
  if (fl.special === 'lake') fl.lake = {x:72, y:150, rx:24, ry:12};
  if (fl.special === 'chest') fl.chest = {x:64, y:132, open:false};
  if (fl.special === 'cp') fl.ladder = {x:104, y:196};
  const n = fl.special === 'vein' ? 30 : fl.special === 'nest' ? 12 : fl.special === 'cp' ? 8 : 22;
  const w = Object.entries(shallowMix(L, layerOf(f))).map(([k, v]) => ({k, w: fl.special === 'vein' && k !== 'stone' ? v * 3 : v}));
  const bad = (x, y) => (x > 54 && x < 90 && y < 66) || (fl.lake && Math.abs(x + 8 - fl.lake.x) < fl.lake.rx + 10 && Math.abs(y + 6 - fl.lake.y) < fl.lake.ry + 9) ||
    (fl.chest && Math.abs(x - fl.chest.x) < 20 && Math.abs(y - fl.chest.y) < 18) || (fl.elevator && x < 40 && y < 70) || (fl.ladder && Math.abs(x - fl.ladder.x) < 20 && Math.abs(y - fl.ladder.y) < 18) ||
    (fl.lava && ((x < 44 && y > 88 && y < 110) || (x > 100 && y > 168 && y < 190)));
  for (let i = 0; i < n; i++) for (let t = 0; t < 30; t++) {
    const x = Math.round(rnd(14, 116)), y = Math.round(rnd(52, 222));
    if (bad(x, y) || fl.rocks.some(o => Math.abs(o.x - x) < 16 && Math.abs(o.y - y) < 14)) continue;
    const k = wpick(w).k; fl.rocks.push({x, y, k, hp:ROCKHP[k], max:ROCKHP[k]}); break;
  }
  const mc = fl.special === 'cp' ? 0 : fl.special === 'nest' ? 6 : (Math.random() < .55 ? 1 : 0) + (Math.random() < .35 ? 1 : 0) + (layerOf(f) >= 3 ? 1 : 0);
  const sc = 1 + (f - 1) * .025;
  for (let i = 0; i < mc; i++) { const k = pick(L.mons), m = MONT[k]; const p = randWalk(fl);
    fl.mons.push({k, x:p[0], y:p[1], hp:Math.round(m.hp * sc), max:Math.round(m.hp * sc), atk:Math.round(m.atk * sc), spd:m.spd, cd:0, kb:0, wait:rnd(0, 2), path:[]}); }
  if (isDeep(f)) deepGen(fl);
  guildFloor(fl); applyCurse(fl, M.cl || 0);
  if (isFullMoon()) for (let i = 0; i < 1 + (Math.random() < .5 ? 1 : 0); i++) { const p = randWalk(fl); fl.mons.push(mkMon('mslime', p[0], p[1], sc, 0)); }
  { const q = S.cp && S.cp.q; if (q && q.k === 'grant' && !q.done && f >= 60 && isDeep(f) && Math.random() < .5) { const k = pick(DEEP_MONS), p = randWalk(fl), m = mkMon(k, p[0], p[1], deepSc(f) * 8, 0); m.atk = Math.round(m.atk / 8 * 1.6); m.trial = 1; fl.mons.push(m); setTimeout(() => toast('⚔ 金のオーラの<b>試練の魔物</b>がこの階にいる！（グラントの依頼）', 3500), 500); } }
  secretPlace(fl);
  if (f === 1 && unl('stele')) { fl.door = true; fl.rocks = fl.rocks.filter(o => !(o.x < 50 && o.y < 76)); fl.blk = [...(fl.blk || []), [14, 44, 46, 68]]; }
  FL = fl; M.floor = f; if (f > M.max) { M.max = f; if (f % 10 === 1 && f > 1 && (M.hpL || 0) < 5) { M.hpL = (M.hpL || 0) + 1; M.hpMax += 15; M.hp = Math.min(M.hpMax, M.hp + 15); toast(`💪 新しい層にたどり着いた。最大体力 +15（${M.hpMax}）`, 3500); } }
  buildMineWalk();
  return fl;
}
function randWalk(fl) {   // v0.46: 置物・池・溶岩の中には魔物を置かない（届かない所に湧いて倒せない不具合の修正）
  const bl = [...(fl.blk || []), ...(fl.lava ? [[8, 96, 42, 110], [106, 176, 136, 190]] : []), ...(fl.lake ? [[fl.lake.x - fl.lake.rx, fl.lake.y - fl.lake.ry, fl.lake.x + fl.lake.rx, fl.lake.y + fl.lake.ry]] : []), ...(fl.chest ? [[fl.chest.x, fl.chest.y, fl.chest.x + 16, fl.chest.y + 16]] : [])];
  for (let t = 0; t < 80; t++) { const x = rnd(20, 124), y = rnd(80, 224);
    if (fl.rocks.some(o => x > o.x - 2 && x < o.x + 18 && y > o.y - 2 && y < o.y + 16)) continue;
    if (bl.some(b => x > b[0] - 6 && x < b[2] + 6 && y > b[1] - 6 && y < b[3] + 6)) continue;
    if (fl.walkFn && !fl.walkFn(x | 0, y | 0)) continue;
    return [x, y]; }
  return [72, 120]; }
function buildMineWalk() {
  if (FL && !FL.nrS && nrN()) { FL.nrS = 1; const n = Math.min(5, nrN()); for (const m of FL.mons) { m.hp = m.max = Math.round(m.max * (1 + .25 * n)); m.atk = Math.round(m.atk * (1 + .15 * n)); } }
  const g = new Uint8Array(GW * GH), fl = FL;
  const blocks = fl.rocks.map(o => [o.x + 1, o.y + 3, o.x + 15, o.y + 13]);
  if (fl.lava) blocks.push([8, 96, 42, 110], [106, 176, 136, 190]);
  if (fl.blk) blocks.push(...fl.blk);
  if (fl.lake) blocks.push([fl.lake.x - fl.lake.rx, fl.lake.y - fl.lake.ry, fl.lake.x + fl.lake.rx, fl.lake.y + fl.lake.ry]);
  if (fl.elevator) blocks.push([14, 44, 30, 62]);
  if (fl.chest) blocks.push([fl.chest.x, fl.chest.y + 4, fl.chest.x + 16, fl.chest.y + 16]);
  for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
    const x = cx * 2 + 1, y = cy * 2 + 1;
    g[cy * GW + cx] = (x >= 12 && x <= 132 && y >= 44 && y <= 236 && (!fl.walkFn || fl.walkFn(x, y)) && !blocks.some(r => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3])) ? 1 : 0;
  }
  WALK.mine = g;
}
function mineObjs() {
  if (!FL) return [];
  if (FL.arena) return [{id:'arx', lb:'降参して闘技場を出る', r:[60, 24, 84, 44], st:[72, 52], act:() => arenaEnd(false)}];
  if (FL.vault) return [{id:'up', lb:'元の階へ戻る（はしご）', r:[62,30,82,44], st:[72,52], act:() => leaveSpecial()}, ...(FL.chest ? [{id:'vchest', lb:'大きな宝箱を開ける', r:[56, 104, 88, 136], st:[72, 146], act:() => vaultChest()}] : [])];
  if (FL.ak) return [{id:'up', lb:'B1へ戻る（はしご）', r:[62,30,82,44], st:[72,52], act:() => leaveSpecial()}, {id:'abook', lb:'古の料理帖', r:[50, 110, 94, 154], st:[72, 162], act:() => openAncBook()},
    {id:'ashelf', lb:'星の器の棚', r:[94, 42, 132, 84], st:[110, 92], act:() => ancShelf()}, {id:'ahearth', lb:'古の竈', r:[12, 42, 52, 82], st:[32, 92], act:() => toast(stSt().book ? '古の竈の火：料理の値打ち+5%（ずっと）' : '古いかまどに、まだ火が残っている。料理帖を読んでみよう')}];
  const o = FL.f === 1 || (FL.boss && !FL.mons.some(m => m.boss)) ? [{id:'up', lb:FL.dg ? `外へ出る（${FL.boss ? '帰り道のはしご' : 'はしご'}）` : '地上へ戻る（はしご）', r:[62,30,82,44], st:[72,52], act:() => exitMine(false)}] : [];
  if (!o.length && FL.f > 1) o.push({id:'up', lb:`上の階へ戻る（B${FL.f - 1}・はしご）`, r:[62,30,82,44], st:[72,52], act:() => ascend()});
  if (FL.elevator) o.push({id:'elev', lb:'昇降機', r:[14,40,30,62], st:[34,56], act:() => openElevator()});
  if (FL.ladder) o.push({id:'down', lb:`下の階へ降りる（B${FL.f + 1}）`, r:[FL.ladder.x, FL.ladder.y, FL.ladder.x + 16, FL.ladder.y + 16], st:[FL.ladder.x + 8, FL.ladder.y + 20], act:() => descend()});
  if (FL.lake) o.push({id:'lake', lb:'地底湖で釣る', r:[FL.lake.x - FL.lake.rx, FL.lake.y - FL.lake.ry, FL.lake.x + FL.lake.rx, FL.lake.y + FL.lake.ry], st:[FL.lake.x, FL.lake.y + FL.lake.ry + 6], act:() => openFish('lake')});
  if (FL.crack) o.push({id:'crack', lb:'ひび割れた壁を崩す', r:[FL.crack.x - 2, FL.crack.y - 2, FL.crack.x + 22, FL.crack.y + 16], st:[FL.crack.x + 10, FL.crack.y + 22], act:() => openVault()});
  if (FL.door) o.push({id:'door', lb:'封印の扉', r:[14, 40, 46, 70], st:[30, 78], act:() => openSealDoor()});
  if (FL.chest && !FL.chest.open) o.push({id:'chest', lb:'宝箱を開ける', r:[FL.chest.x, FL.chest.y, FL.chest.x + 16, FL.chest.y + 16], st:[FL.chest.x + 8, FL.chest.y + 22], act:() => openChest()});
  for (const p of FL.plants || []) o.push({id:'pl' + p.x + '_' + p.y, lb:`${ingName(p.id)}を採る`, r:[p.x - 2, p.y - 2, p.x + 14, p.y + 14], st:[p.x + 6, p.y + 18], act:() => pickPlant(p)});
  return o;
}
const bestOf = kind => { let b = null; for (const t of S.toolInv) { const tl = TOOLI[t.id]; if (t.dur > 0 && tl.kind === kind && (!b || tl.tier > TOOLI[b.id].tier)) b = t; } return b; };
function heldOr(kind) { const h = heldItem(); if (h && h.t === 'tool' && toolOf(h).kind === kind) return toolInst(h.uid); return bestOf(kind); }
function buffOn(k) { const b = mineState().buff[k]; return b && b > S.t; }
let swingT = 0, attackT = 0, hurtT = 0;
function mineRockAct(rk) { player.mining = rk; player.target = null; }
function attackAct(m) { player.target = m; player.mining = null; }
function rockAt(x, y) { return FL && FL.rocks.find(o => x >= o.x && x <= o.x + 16 && y >= o.y && y <= o.y + 13); }
function monAt(x, y) { return FL && FL.mons.find(m => m.boss ? Math.abs(m.x - x) < 20 && y > m.y - 42 && y < m.y + 5 : Math.abs(m.x - x) < 9 && y > m.y - 15 && y < m.y + 3); }
function standNear(o) { const cx = o.x + 8, cy = o.y + 7; const c = [[cx, cy + 12], [cx - 14, cy + 2], [cx + 14, cy + 2], [cx, cy - 12]];
  c.sort((a, b) => Math.hypot(a[0] - player.x, a[1] - player.y) - Math.hypot(b[0] - player.x, b[1] - player.y)); for (const p of c) if (walkable('mine', p[0] | 0, p[1] | 0)) return p; return c[0]; }
function mineUpdate(dt) {
  if (scene !== 'mine' || !FL) return;
  const M = mineState();
  if (FL.arena) { arenaTick(dt); if (!FL) return; }
  if (FL.v === 'mist') { M.hp -= dt * Math.max(.4, M.hpMax * .004) * (buffOn('def') ? .5 : 1) * (gearAccOn('neck_amulet') ? .5 : 1) * (buffOn('p_anti') ? 0 : 1); if (M.hp <= 0) return mineDie(); }
  if (!player.target && !padDir) { const near = FL.mons.find(m => Math.hypot(m.x - player.x, m.y - player.y) < (m.boss ? 30 : 15)); if (near) { player.resume = player.mining; player.mining = null; player.target = near; player.path = []; } }
  // mining
  if (player.mining) {
    const rk = player.mining;
    if (!FL.rocks.includes(rk)) player.mining = null;
    else if (!player.path.length) {
      if (Math.hypot(rk.x + 8 - player.x, rk.y + 7 - player.y) > 18) { const p = standNear(rk); walkTo(p[0], p[1], null); }
      else {
        const pk = heldOr('pick'), wsm = wStats(), mt = pk ? TOOLI[pk.id].tier + (gearFx().mine ? 1 : 0) : (wsm.rock ? Math.min(8, wsm.tier || 1) : 0);
        if (!pk && !wsm.rock) { player.mining = null; toast('ツルハシがない。外の市場の「道具」で買える。'); }
        else if (mt < ROCKREQ[rk.k]) { player.mining = null; toast(`硬すぎる！ この岩には${GEAR[ROCKREQ[rk.k] - 1].name}以上のツルハシが必要。`); }
        else { player.flip = rk.x + 8 < player.x; player.swing = .25;
          const per = mt * 1.5 * (buffOn('mine') ? 1.5 : 1), hits = Math.max(1, Math.ceil(rk.hp / per)), cost = hits * (mt >= 4 ? 1 : 2) * .6 * (gearAccOn('ring_miner') ? .75 : 1);
          if (M.st >= cost) M.st -= cost; else { const lack = Math.ceil((cost - M.st) / 2); M.st = 0; M.hp -= lack; floatAt(player.x, player.y - 20, `気力切れ -${lack}`, 'bad'); if (M.hp <= 0) return mineDie(); }
          rk.hp = 0; sfx('tick'); breakRock(rk, pk); if (player.mining === rk) player.mining = null; }
      }
    }
  }
  // attacking (v0.37: equipped weapon decides range / speed / area)
  if (wSwingT > 0) wSwingT -= dt;
  for (const p of PROJ) p.t += dt / .14; PROJ = PROJ.filter(p => p.t < 1);
  if (player.target) {
    const m = player.target, ws = wStats();
    if (!FL.mons.includes(m)) player.target = null;
    else { const d = Math.hypot(m.x - player.x, m.y - player.y), R = ws.r + (m.boss ? 14 : 0);
      if (d > R) { if (!player.path.length || (attackT -= dt) < -0.5) { attackT = 0; const k = Math.max(0, (d - R + 4) / d), tx = player.x + (m.x - player.x) * k, ty = player.y + (m.y - player.y) * k; if (walkable('mine', tx | 0, ty | 0)) walkTo(tx, ty, null); else walkTo(m.x, m.y, null); } }
      else { player.path = []; attackT -= dt; player.flip = m.x < player.x; player.swing = .15;
        if (attackT <= 0) { const f = gearFx(); attackT = ws.cd * (f.swift ? .85 : 1) * (f.spd ? .9 : 1); doAttack(m); } } }
  }
  { const f = gearFx(), rg = .5 * ((f.regen || 0) + (gearAccOn('ring_regen') ? 1 : 0)) + (buffOn('ult') ? 2 : 0) + (buffOn('p_regen') ? 1.5 : 0); if (rg) M.hp = Math.min(M.hpMax, M.hp + rg * dt); }
  famTick(dt); if (!FL) return; compTick(dt);
  // monsters
  for (const m of [...FL.mons]) {
    if (monTickFx(m, dt)) continue;
    if (!FL) return;
    if (m.boss) { bossTick(m, dt); if (!FL) return; continue; }
    const t = MONT[m.k], d = Math.hypot(player.x - m.x, player.y - m.y);
    m.cd -= dt; if (m.kb > 0) { m.kb -= dt; continue; }
    if (d < (FL.f <= 5 ? 45 : 70) * (buffOn('p_stealth') ? .5 : 1)) {
      if (d > 8) { const sp = t.spd * dt * (m.slow > 0 ? .5 : 1), nx = m.x + (player.x - m.x) / d * sp, ny = m.y + (player.y - m.y) / d * sp;
        if (t.fly || walkable('mine', nx | 0, ny | 0)) { m.x = nx; m.y = ny; } else if (walkable('mine', nx | 0, m.y | 0)) m.x = nx; else if (walkable('mine', m.x | 0, ny | 0)) m.y = ny; m.flip = player.x < m.x; }
      else if (m.cd <= 0) { m.cd = 1.1; { const f0 = gearFx(); if (M.invT > tNow || (f0.phantom && Math.random() < .15 * Math.min(2, f0.phantom))) { floatAt(player.x, player.y - 20, 'かわした', 'info'); continue; } skGain(4); } const dmg = Math.max(1, Math.round(m.atk * (buffOn('def') ? .6 : 1) * (1 - armorDef() - (outfitOn('knight') ? .05 : 0)) * forgeMulA() * defMulFx() / deepMul())); M.hp -= dmg; hurtT = .25; floatAt(player.x, player.y - 20, '-' + dmg, 'bad'); sfx('break'); if (M.hp <= 0) return mineDie(); }
    } else { m.wait -= dt; if (m.wait <= 0) { m.wait = rnd(1.5, 4); const p = randWalk(FL); m.path = [p]; } if (m.path.length) { const p = m.path[0], dd = Math.hypot(p[0] - m.x, p[1] - m.y); if (dd < 2) m.path.shift(); else { const nx = m.x + (p[0] - m.x) / dd * t.spd * .5 * dt, ny = m.y + (p[1] - m.y) / dd * t.spd * .5 * dt; if (t.fly || walkable('mine', nx | 0, ny | 0)) { m.x = nx; m.y = ny; } else m.path = []; } } }
  }
}
function tripAdd(id, n) { const M = mineState(); M.trip[id] = (M.trip[id] || 0) + n; }
function breakRock(rk, pk) {
  const M = mineState(); FL.rocks = FL.rocks.filter(o => o !== rk); FL.broken++; if (pk) useTool(pk); renderHot(); plXp(1);
  if (rk.k !== 'stone') { const n = 1 + (Math.random() < .3 ? 1 : 0); giveBag('i', rk.k, false, n); tripAdd(rk.k, n); M.ever[rk.k] = true; S.known.i[rk.k] = true; floatAt(rk.x + 8, rk.y - 4, `${ingName(rk.k)} +${n}`, 'info');
    const g = GEAR.find(x => x.unlock === rk.k); if (g && !M['ann' + g.tier]) { M['ann' + g.tier] = true; toast(`⛏ ${ingName(rk.k)}を掘り出した！ 市場に<b>${g.name}のツルハシと剣</b>が並ぶようになった。`, 4500); } }
  else if (Math.random() < .14 * (gearFx().forage ? 2 : 1)) { const id = FL.dg ? pick(DGD[FL.dg].mats) : pick(LAYERS[layerOf(FL.f)].forage); giveBag('i', id, false, 1); tripAdd(id, 1); floatAt(rk.x + 8, rk.y - 4, ingName(id) + ' +1', 'info'); }
  if (FL.v && rk.k === 'stone') deepStone(rk);
  if (!FL.ladder && (Math.random() < .06 + FL.broken * .025 || FL.rocks.length === 0 || (FL.special === 'nest' && !FL.mons.length && Math.random() < .5))) { FL.ladder = {x:rk.x, y:rk.y}; sfx('ok'); floatAt(rk.x + 8, rk.y - 10, '階段を見つけた！', ''); }
  buildMineWalk(); dirty = true;
}
function killMon(m, sw) {
  monKilled(m);
  FL.mons = FL.mons.filter(x => x !== m); player.target = null; if (sw) { useTool(sw); renderHot(); }
  if (player.resume && FL.rocks.includes(player.resume)) { player.mining = player.resume; } player.resume = null;
  wmXp(m.boss ? 15 : 1);
  if (FL.arena) { plXp(m.boss ? 30 : 2 + Math.floor((FL.eqf || 1) / 8)); return; }
  monPartDrop(m); if (m._buc > 1 && MPART[m.k] && unl('monster')) { const n = m._buc >= 2 ? 2 : 1; giveBag('i', MPART[m.k][0], false, n); tripAdd(MPART[m.k][0], n); floatAt(m.x, m.y - 22, ingName(MPART[m.k][0]) + ' +' + n, 'info'); }
  if (m._gold) { const g = Math.round(200 + (FL.eqf || FL.f || 1) * 20); S.gold += g; floatAt(m.x, m.y - 30, `+${g}G`, 'info'); }
  gearOnKill(m); wGain(m);
  if (FL.dg === 'tower' && !m.boss && Math.random() < .006 * accMul('luck')) { const g = twDrop(2); if (g) toast(`⚔ ${MONT[m.k].n}が<b style="color:${RAR_C[g.r]}">${gNm(g)}</b>を落とした！`, 3500); }
  if (FL.v && skOn() && Math.random() < .0008 * accMul('luck')) { const g = twDrop(2); if (g) toast(`⚔ 深層の魔物が<b style="color:${RAR_C[g.r]}">${gNm(g)}</b>を落とした！`, 3500); }
  if (m.boss && FL.dg) bossDefeated(m);
  if (m.trial && S.cp && S.cp.q && S.cp.q.k === 'grant') { S.cp.q.done = 1; toast('⚔ 試練の魔物を倒した！ ギルド前のグラントに報告しよう', 4000); }
  plXp(m.boss ? 60 : 2 + Math.floor(((FL.eqf || FL.f) || 1) / 8)); mrTame(m); mrEggDrop(FL, m.boss ? .5 : .004); tmDrop(.005, '魔物が落とした'); famXp(m.boss ? 30 : 1 + Math.floor(((FL.eqf || FL.f) || 1) / 12));
  for (const [id, p] of MONT[m.k].drop) if (Math.random() < p * monDropMul(m.k) * curseDrop() * accMul('luck') * (1 + .2 * (gearFx().luck || 0))) { giveBag('i', id, false, 1); tripAdd(id, 1); floatAt(m.x, m.y - 10, ingName(id) + ' +1', 'info'); }
  if (FL.v) { deepKill(m); legRoll(.002, 'naraku_kinoko', '奈落の深層の魔物が落とした。'); }
  if (FL.special === 'nest' && !FL.mons.length && !FL.ladder) { const p = randWalk(FL); FL.ladder = {x:p[0] - 8, y:p[1] - 8}; if (FL.dg === 'tower') { const n = twFloorClear(); toast(`🗼 ${FL.f}階を制した！ 修練の証 +${n}。階段が現れた。`); } else toast('魔物を全滅させた！ 階段が現れた。'); }
}
// v0.51：来たはしごで上の階へ戻る（戻った階は岩も魔物もそのまま）
function linkAbove(a) { if (!FL || !a) return; FL.above = a; let n = 0, x = FL; while (x.above) { if (++n >= 25) { x.above = null; break; } x = x.above; } }
function ascend() {
  const a = FL.above, M = mineState(); player.mining = player.target = null;
  if (a) { FL = a; M.floor = a.f; buildMineWalk(); }
  else if (FL.dg) genDgFloor(FL.dg, FL.f - 1);
  else genFloor(FL.f - 1);
  if (!FL.ladder) { FL.ladder = {x:104, y:196}; FL.rocks = FL.rocks.filter(o => !(Math.abs(o.x - 104) < 20 && Math.abs(o.y - 196) < 18)); buildMineWalk(); }
  const L = FL.ladder; go('mine', L.x + 8, L.y + 20); sfx('door'); toast(`B${FL.f}に戻った。`); tut('m_up');
}
function descend() {
  const above = FL;
  if (FL.dg) { genDgFloor(FL.dg, FL.f + 1); linkAbove(above); go('mine', 72, 52); sfx('door'); setTimeout(dgEnterMsg, 300); return; }
  const f = FL.f + 1; genFloor(f); linkAbove(above); const M = mineState();
  if (f % 5 === 0) toast(`B${f}：昇降機を見つけた！ 次からここまで直接降りられる。`, 3500);
  if (f % 10 === 1 && !FL.v) toast(`🕳 新しい層：<b>${LAYERS[layerOf(f)].n}</b>`, 3500);
  go('mine', 72, 52); sfx('door'); deepEnterMsg(f);
}
function enterMine(f) { const M = mineState(); if (!payCurse()) return; M.hp = M.hpMax; M.st = M.stMax + (gearAccOn('ring_stam') ? 20 : 0); M.trip = {}; M.buff = {}; M.revive = 0; M.charm = 0; M.seraRev = 0; genFloor(f); closeModal(); go('mine', 72, 52); deepEnterMsg(f); }
function exitMine(scrollUsed) { if (FL && FL.dg) { exitDg(); if (scrollUsed) toast('帰還の巻物で外に出た。'); return; } const M = mineState(); M.cl = 0; M.hp = M.hpMax; M.st = M.stMax; M.trip = {}; FL = null; player.mining = player.target = null; go('outside', 48, 222); if (scrollUsed) toast('帰還の巻物で地上に戻った。'); }
function plSt() { if (!S.pl) { const k = Object.values(S.kills || {}).reduce((a, b) => a + b, 0); S.pl = {lv:1, xp:Math.min(20000, k * 2), ate:{}, an:0}; } return S.pl; }
const plNeed = lv => 40 * lv;
function plXp(n) {
  if (!unl('mine')) return; const P = plSt(); if (P.lv >= 50) return; P.xp += n; let up = 0;
  while (P.lv < 50 && P.xp >= plNeed(P.lv)) { P.xp -= plNeed(P.lv); P.lv++; up++; const M = mineState(); M.hpMax += 5; M.stMax += 4; M.hp = Math.min(M.hpMax, M.hp + 5); M.st = Math.min(M.stMax, M.st + 4); }
  if (up) { tut('m_plv'); sfx('ok'); if (scene === 'mine' && FL) floatAt(player.x, player.y - 30, `Lv${P.lv}！`, 'info'); toast(`⭐ 主人公が Lv${P.lv} になった！ 最大体力+${5 * up}・最大気力+${4 * up}`, 3000); dirty = true; }
}
function plAte(key) {
  const P = plSt(); if (P.ate[key]) return; P.ate[key] = 1; P.an++; const M = mineState(); let t = '';
  if (P.an <= 100) { M.hpMax += 1; t = '最大体力+1'; if (P.an % 2 === 0) { M.stMax += 1; t += '・最大気力+1'; } tut('m_plate'); floatAt(player.x, player.y - 34, `初めての味！ ${t}`, 'info'); }
  dirty = true;
}
// v0.52.5：帰還の巻物＝帰還の印（次はその階から）・持ち帰り+20%・倒れそうな時に自動で使う
function scrollReturn(auto) {
  const M = mineState(); let bonus = []; tut('m_scroll');
  for (const id in M.trip) { const n = Math.ceil(M.trip[id] * .2); if (n > 0 && ING[INGI[id]] && !isItem(id)) { add(S.inv, id, n); bonus.push(`${ingName(id)}×${n}`); } }
  let mk = '';
  if (FL && !FL.ak) { const f = FL.f; if (FL.dg) { const D_ = dgSt(), ff = Math.min(f, DGD[FL.dg].fl || 10); if (ff > 1) { D_.mark = {dg:FL.dg, f:ff}; mk = `${DGD[FL.dg].n}の${ff}階`; } } else if (f > 1) { M.mark = f; mk = `B${f}`; } }
  exitMine(true);
  setTimeout(() => popStory(`<div class="tth">📜 帰還の巻物${auto ? '（自動）' : ''}</div><div class="ttx">${auto ? '倒れそうになった瞬間、巻物が光って地上へ運んでくれた。何も失っていない。<br>' : ''}${bonus.length ? '帰り道のおまけ（拾った物の2割）：' + bonus.slice(0, 8).join('・') + (bonus.length > 8 ? ' ほか' : '') + '<br>' : ''}${mk ? `<b>帰還の印</b>を残した。次は入口で「${mk}から再開」を選べる（1回だけ）。` : ''}</div>`), 500);
}
function mineDie() {
  if (FL && FL.arena) return arenaEnd(false);
  if (FL && !FL.ak && !FL.vault && haveIng('scroll') && takeIng('scroll', false, 1)) { scrollReturn(true); return; }
  const M = mineState(); if (M.revive) { M.revive = 0; M.hp = M.hpMax / 2; floatAt(player.x, player.y - 24, 'エリクサー！', 'info'); toast('✨ エリクサーの力で立ち上がった！'); return; } let lost = [];
  for (const id in M.trip) { const n = Math.floor(M.trip[id] / 2); if (n > 0) { takeIng(id, false, Math.min(n, haveIng(id))); lost.push(`${ingName(id)}×${n}`); } }
  const dgR = FL && FL.dg ? dgReturn() : null; if (dgR) dgSt().cur = null;
  player.mining = player.target = null; FL = null; M.hp = M.hpMax; M.st = M.stMax; M.trip = {}; M.cl = 0;
  if (dgR) go(dgR[0], dgR[1], dgR[2]); else go('outside', 48, 222);
  setTimeout(() => modal('倒れてしまった…', `<div class="result"><div class="p">${dgR ? '気がつくとダンジョンの外にいた。冒険者たちが運び出してくれたらしい。' : '気がつくと古井戸の前にいた。ガルドが運び出してくれたらしい。'}</div>${lost.length ? `<div class="p" style="color:#d8806a">落としてしまった物：${lost.join('、')}</div>` : '<div class="p">失った物はなかった。</div>'}</div><div class="btn big" data-a="ok">閉じる</div>`, 'dead'), 400);
  setTimeout(() => bind('[data-a=ok]', closeModal), 450);
}
function openMineEntry() {
  if (!unl('mine')) return gateMsg('mine');
  const M = mineState(); const cps = [1]; for (let f = 5; f <= M.max; f += 5) cps.push(f);
  const pk = bestOf('pick'), sw = bestOf('sword');
  const html = `<div class="result"><div class="p">古井戸の底に続く鉱山。岩を掘って階段を探し、深く潜るほどレアな鉱石と魔物が増える。5階ごとに昇降機がある。</div>
    <div class="p">ツルハシ：${pk ? TOOLI[pk.id].name : '<span style="color:#d8806a">なし（市場の道具で買える）</span>'}　武器：${eqW() ? gDef(eqW()).name : 'なし（鍛冶屋で作る／装備画面で選ぶ）'}　防具：${ARMOR_N[S.armor || 0]}（鍛冶屋で作れる）　最大体力：${M.hpMax}<br>最深到達：${M.max ? 'B' + M.max : 'まだ入っていない'}</div>
    <div class="p">体力と気力は、持っていった<b>料理を食べると回復</b>する（迷宮の中の「食べる」ボタン）。倒れるとその回に拾った物の半分を失う。</div></div>` +
    (M.mark > 1 ? `<div class="btn big grn" data-mk="${M.mark}" style="margin-bottom:${U * 1.2}px">📜 帰還の印：B${M.mark}から再開（1回だけ）</div>` : '') + cps.map(f => `<div class="btn big ${f === 1 ? '' : 'blu'}" data-f="${f}" style="margin-bottom:${U * 1.2}px">${f === 1 ? '入口（B1）から入る' : `昇降機でB${f}（${LAYERS[layerOf(f)].n}）へ`}</div>`).join('');
  const i_ = html.indexOf('</div></div>') + 12; modal('地下迷宮', html.slice(0, i_) + curseUI(unl('curse') ? (dgSt().cl || 0) : 0) + html.slice(i_) + (unl('shugyo') ? `<div class="btn big red" data-a="tw" style="margin-top:${U}px">🗼 ${TW_N}へ（井戸の奥の転移の石から）</div>` : ''), 'mineentry');
  bind('[data-a=tw]', () => openTowerEntry());
  bind('[data-f]', d => enterMine(+d.f));
  bind('[data-mk]', () => { const f = M.mark; M.mark = 0; enterMine(f); });
  bind('[data-cl]', d => { dgSt().cl = +d.cl; tut('curse'); openMineEntry(); });
}
function openElevator() {
  const M = mineState(); const cps = []; for (let f = 5; f <= M.max; f += 5) cps.push(f);
  modal('昇降機', `<div class="btn big grn" data-f="0" style="margin-bottom:${U * 1.2}px">地上へ戻る</div>` + cps.filter(f => f !== FL.f).map(f => `<div class="btn big blu" data-f="${f}" style="margin-bottom:${U * 1.2}px">B${f}（${LAYERS[layerOf(f)].n}）</div>`).join(''), 'elev');
  bind('[data-f]', d => { closeModal(); if (+d.f === 0) exitMine(false); else { genFloor(+d.f); go('mine', 72, 52); } });
}
function openChest() {
  mrEggDrop(FL, .12);
  if (FL.dg) return dgChest();
  if (FL.v) return deepChest();
  const L = layerOf(FL.f), gold = Math.round((80 + Math.random() * 120) * (L + 1) * curseDrop()); FL.chest.open = true; S.gold += gold;
  const ores = Object.keys(LAYERS[L].rocks).filter(k => k !== 'stone'), got = [];
  for (let i = 0; i < 2 + (Math.random() < .5 ? 1 : 0); i++) { const k = pick(ores); giveBag('i', k, false, 1); tripAdd(k, 1); mineState().ever[k] = true; got.push(ingName(k)); }
  sfx('ok'); toast(`宝箱から ${fmt(gold)}G と ${got.join('、')} を手に入れた！`, 4000); if (unl('arms') && Math.random() < .35 * accMul('luck')) rollGearDrop(FL, 1); FL.chest = null; buildMineWalk();
}
const EATFX = t => ({hp:12 + t[4] * 8, st:12 + t[0] * 8, atk:t[1] >= 3, mine:t[3] >= 3, def:t[2] >= 3});
function openEat() {
  const M = mineState(), items = allDishes();
  const html = `<div class="p">体力 ${Math.round(M.hp)}/${M.hpMax}　気力 ${Math.round(M.st)}/${M.stMax}<br>旨み→体力、甘い→気力。辛い★3以上で攻撃力アップ、ほろ苦い★3以上で採掘力アップ、酸っぱい★3以上で守りアップ（各1分）。金色の料理は効果2倍。</div>` +
    (items.map(x => { const t = dishTaste(x.k), e = EATFX(t), m = x.g ? 2 : 1;
      return `<div class="row">${dishIcHTML(x.k, U * 10, x.g)}<div class="t"><b>${x.g ? '金色の' : ''}${dishInfo(x.k).name}${!plSt().ate[x.k] && plSt().an < 100 ? ' <span style="color:#e8c060;font-weight:normal">✨初めて</span>' : ''} ×${x.n}</b><span>体力+${e.hp * m}　気力+${e.st * m}${e.atk ? '　攻撃↑' : ''}${e.mine ? '　採掘↑' : ''}${e.def ? '　守り↑' : ''}</span></div><div class="btn" data-k="${x.k}" data-g="${x.g ? 1 : 0}">食べる</div></div>`; }).join('') || '<div class="p">料理を持っていない。店で作った料理は倉庫やカバンから食べられる。</div>');
  modal('料理を食べる', html, 'eat');
  bind('[data-k]', d => { const g = d.g === '1'; if (!takeDish(d.k, g, 1)) return; const e = EATFX(dishTaste(d.k)), m = g ? 2 : 1;
    plAte(d.k); M.hp = Math.min(M.hpMax, M.hp + e.hp * m); M.st = Math.min(M.stMax, M.st + e.st * m);
    for (const k of ['atk','mine','def']) if (e[k]) M.buff[k] = S.t + 60 * m * buffDurMul();
    if (ULT_KEYS.has(d.k)) { M.buff.ult = S.t + 300 * buffDurMul(); M.hp = M.hpMax; M.st = M.stMax; toast('👑 究極の料理の力！ 5分間、攻撃×1.5・受けるダメージ×0.7・体力回復', 3500); }
    sfx('ok'); floatAt(player.x, player.y - 22, `体力+${e.hp * m} 気力+${e.st * m}`, 'info'); openEat(); });
}
function drawMine() {
  if (!FL) return [];
  const list = [];
  if (FL.lake) { const l = FL.lake; ctx.fillStyle = '#0a1420'; ctx.beginPath(); ctx.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#16283c'; ctx.beginPath(); ctx.ellipse(l.x, l.y, l.rx - 3, l.ry - 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a8ac8'; for (let i = 0; i < 4; i++) ctx.fillRect(l.x - 14 + i * 9, l.y - 3 + ((tNow * 2 + i) % 3 | 0) * 2, 2, 1); }
  if (FL.lava) { ctx.fillStyle = `rgba(255,${150 + Math.sin(tNow * 3) * 40 | 0},60,.35)`; ctx.fillRect(10, 100, 30, 6); ctx.fillRect(108, 180, 26, 6); }
  if (FL.ladder) list.push({y:FL.ladder.y, f:() => { const i = CH.hole; ctx.drawImage(IMG.chars, i * 16, 2, 16, 16, FL.ladder.x, FL.ladder.y, 16, 16); }});
  if (FL.elevator) list.push({y:60, f:() => drawChar('elevator', 22, 62)});
  if (FL.chest) list.push({y:FL.chest.y + 14, f:() => drawChar('chest', FL.chest.x + 8, FL.chest.y + 16)});
  for (const o of FL.rocks) list.push({y:o.y + 12, f:() => { const i = ROCKS.indexOf(o.k); ctx.drawImage(IMG['rocks_' + (FL.dg || (FL.v ? 'deep' : 'l' + layerOf(FL.f)))] || IMG.rocks, i * 16, 0, 16, 13, o.x, o.y, 16, 13);
    if (o.hp < o.max) { ctx.fillStyle = '#140c08'; ctx.fillRect(o.x + 2, o.y - 3, 12, 2); ctx.fillStyle = '#e8b858'; ctx.fillRect(o.x + 2, o.y - 3, Math.max(1, Math.round(12 * o.hp / o.max)), 2); }
    if (player.mining === o && Math.random() < .4) { ctx.fillStyle = '#fff3c0'; ctx.fillRect(o.x + 4 + Math.random() * 8 | 0, o.y + Math.random() * 6 | 0, 1, 1); } }});
  list.push(...drawBossLayer()); if (FL) list.push(...drawSkillLayer());
  if (FL.crack) list.push({y:FL.crack.y + 12, f:() => ctx.drawImage(IMG.crackwall, FL.crack.x, FL.crack.y)});
  if (FL.door) list.push({y:68, f:() => ctx.drawImage(IMG.sealdoor, stSt().open ? 32 : 0, 0, 32, 30, 14, 40, 32, 30)});
  if (FL.vault && FL.chest) list.push({y:132, f:() => ctx.drawImage(IMG.bigchest, 60, 110)});
  for (const m of FL.mons) list.push({y:m.y, f:() => { if (m.boss) return drawBoss(m); const fl = MONT[m.k].fly ? Math.sin(tNow * 8 + m.x) * 2 : 0; if (m.elite) drawElite(m); if (m.trial) drawTrial(m); drawChar(m.k, m.x, m.y + fl, m.flip);
    if (m.hp < m.max) { ctx.fillStyle = '#140c08'; ctx.fillRect(m.x - 6, m.y - 19, 12, 2); ctx.fillStyle = '#d8503a'; ctx.fillRect(m.x - 6, m.y - 19, Math.max(1, Math.round(12 * m.hp / m.max)), 2); } }});
  list.push(...drawDeepUnder(), ...drawProj(), ...drawFam(), ...drawComp());
  return list;
}

// ====================================================== audio
let AC = null, bgmG = null, seG = null, nextBar = 0, barN = 0;
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
function initAudio() {
  if (AC) return; try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const m = AC.createGain(); m.gain.value = .7; m.connect(AC.destination);
    bgmG = AC.createGain(); bgmG.gain.value = S.ui.bgm ? .16 : 0; bgmG.connect(m);
    seG = AC.createGain(); seG.gain.value = S.ui.se ? .45 : 0; seG.connect(m);
    nextBar = AC.currentTime + .2; if (!window.__bgmIv) window.__bgmIv = setInterval(schedBgm, 250);
  } catch (e) { AC = null; }
}
function tone(f, t, d, type, g, dest, att = .01) { const o = AC.createOscillator(), a = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + att); a.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(a); a.connect(dest); o.start(t); o.stop(t + d + .05); return o; }
function noise(t, d, g, dest, f = 2000, q = .8) { const n = AC.sampleRate * d | 0, b = AC.createBuffer(1, n, AC.sampleRate), c = b.getChannelData(0); for (let i = 0; i < n; i++) c[i] = Math.random() * 2 - 1;
  const s = AC.createBufferSource(); s.buffer = b; const fl = AC.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q; const a = AC.createGain(); a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl); fl.connect(a); a.connect(dest); s.start(t); }
const CHORDS = [[57,60,64],[53,57,60],[55,59,62],[52,55,59],[57,60,64],[50,53,57],[52,56,59],[52,55,59]];
const PENTA = [69,72,74,76,79,81];
function audioWake() {
  if (!AC) return; if (AC.state === 'running') return;
  try { const p = AC.resume(); if (p && p.then) p.then(() => { if (AC.state !== 'running') audioRebuild(); else nextBar = Math.max(nextBar, AC.currentTime + .1); }).catch(audioRebuild); } catch (e) { audioRebuild(); }
}
let audioRebuildT = 0;
function audioRebuild() { if (Date.now() - audioRebuildT < 1500) return; audioRebuildT = Date.now(); try { if (AC && AC.close) AC.close(); } catch (e) {} AC = null; initAudio(); }
document.addEventListener('visibilitychange', () => { if (!document.hidden) { audioWake(); if (typeof tabWatch === 'function' && S && S.v) tabWatch(); } });
window.addEventListener('pageshow', () => audioWake());
['pointerdown', 'touchend', 'keydown'].forEach(ev => window.addEventListener(ev, () => audioWake(), {passive:true}));
function schedBgm() {
  if (!AC || AC.state !== 'running') return;
  if (nextBar < AC.currentTime - 1) nextBar = AC.currentTime + .1;
  while (nextBar < AC.currentTime + .6) {
    const t = nextBar, ch = CHORDS[barN % CHORDS.length], dur = 3.2;
    ch.forEach(m => tone(mf(m), t, dur + .6, 'triangle', .05, bgmG, .9));
    tone(mf(ch[0] - 12), t, dur, 'sine', .09, bgmG, .05);
    for (let k = 0; k < 4; k++) if (Math.random() < .55) tone(mf(pick(PENTA)), t + k * .8 + Math.random() * .1, 1.4, 'sine', .045, bgmG, .005);
    if (scene === 'interior') for (let k = 0; k < 6; k++) noise(t + Math.random() * dur, .03, .05, bgmG, 3000 + Math.random() * 3000, 2);
    nextBar += dur; barN++;
  }
}
const SFX = {
  tick: t => tone(1400, t, .05, 'square', .05, seG),
  coin: t => { tone(1320, t, .1, 'square', .07, seG); tone(1760, t + .06, .18, 'square', .06, seG); },
  pop: t => { const o = tone(380, t, .14, 'triangle', .2, seG); o.frequency.exponentialRampToValueAtTime(760, t + .1); },
  cook: t => noise(t, .7, .18, seG, 5000, .5),
  door: t => { tone(90, t, .25, 'sine', .35, seG); noise(t, .12, .12, seG, 500); },
  break: t => { noise(t, .3, .3, seG, 1200, 1); tone(220, t, .2, 'sawtooth', .05, seG); },
  splash: t => noise(t, .25, .2, seG, 900, 1),
  ok: t => [0, 4, 7, 12].forEach((d, i) => tone(mf(69 + d), t + i * .07, .3, 'triangle', .1, seG)),
};
function sfx(n) { if (!AC || !S.ui.se) return; try { SFX[n] && SFX[n](AC.currentTime); } catch (e) {} }
function applyAudio() { if (!AC) return; bgmG.gain.value = S.ui.bgm ? .16 : 0; seG.gain.value = S.ui.se ? .45 : 0; }
// ====================================================== save / load
let dbRef = null, lastDb = 0;
function serialize() { S.last = Date.now(); S.pos = {scene, x:player.x, y:player.y}; return JSON.stringify(S); }
// ===== v0.46: 確実なセーブ（検査・予備3世代・壊れたら予備から・クラウドは圧縮して順番に・二重起動の見張り）
const BAK_KEYS = ['nk_save_bak1', 'nk_save_bak2', 'nk_save_bak3'], SV = {ok:0, err:'', lastLocal:0, lastCloud:0, cloudErr:'', bakT:0, busy:false, pend:null, readOnly:false, warned:0, tab:(() => { try { let t = sessionStorage.getItem('nk_tabid'); if (!t) { t = Math.random().toString(36).slice(2); sessionStorage.setItem('nk_tabid', t); } return t; } catch (e) { return Math.random().toString(36).slice(2); } })()};
function cleanNum(o, d = 0) { if (d > 6 || !o || typeof o !== 'object') return; for (const k in o) { const v = o[k]; if (typeof v === 'number' && !isFinite(v)) o[k] = 0; else if (v && typeof v === 'object') cleanNum(v, d + 1); } }
function validSave(d) { return d && d.v === 1 && typeof d.gold === 'number' && isFinite(d.gold) && typeof d.t === 'number' && d.known && d.known.r && Array.isArray(d.plots); }
function lsSet(k, v) {
  try { localStorage.setItem(k, v); return true; }
  catch (e) {   // 容量いっぱい：古い予備とお知らせの履歴を削ってもう一度
    try { for (const b of BAK_KEYS.slice().reverse()) if (b !== k) { localStorage.removeItem(b); try { localStorage.setItem(k, v); return true; } catch (_) {} } } catch (_) {}
    SV.err = '端末の保存場所がいっぱい'; return false;
  }
}
function rotateBak(js) { for (let i = BAK_KEYS.length - 1; i > 0; i--) { try { const p = localStorage.getItem(BAK_KEYS[i - 1]); if (p) lsSet(BAK_KEYS[i], p); } catch (e) {} } lsSet(BAK_KEYS[0], js); }
function saveNow(force) {
  if (SV.readOnly) return;
  let js; try { cleanNum(S); js = serialize(); if (!validSave(JSON.parse(js))) throw new Error('bad'); } catch (e) { SV.err = 'セーブの中身に問題'; return; }
  const ok = lsSet(SAVE_KEY, js);
  if (ok) { SV.lastLocal = Date.now(); SV.err = ''; try { localStorage.setItem('nk_tab', JSON.stringify({id:SV.tab, t:Date.now()})); } catch (e) {} }
  else if (Date.now() - SV.warned > 120000) { SV.warned = Date.now(); toast('⚠ 端末にセーブできなかった（保存場所がいっぱい）。「施設」→「セーブ」から引き継ぎコードを作っておこう', 5000); }
  if (ok && Date.now() - SV.bakT > 300000) { SV.bakT = Date.now(); rotateBak(js); }
  if (dbRef && (force || Date.now() - lastDb > 30000)) { lastDb = Date.now(); cloudPush(js); }
  dirty = false;
}
async function packZ(js) {
  if (!window.CompressionStream) return null;
  const cs = new Blob([js]).stream().pipeThrough(new CompressionStream('deflate')); const buf = new Uint8Array(await new Response(cs).arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192)); return btoa(bin);
}
async function unpackZ(z) { const bin = atob(z), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate'))).text(); }
async function cloudPush(js) {   // 1つずつ順番に書く（重ならない）。失敗したら少し待ってやり直す
  SV.pend = js; if (SV.busy) return; SV.busy = true;
  try {
    while (SV.pend) { const cur = SV.pend; SV.pend = null; let tries = 0;
      while (true) { try { const z = await packZ(cur), at = JSON.parse(cur).last || Date.now(); await dbRef.set(z ? {z, at, n:cur.length} : {json:cur, at}); SV.lastCloud = Date.now(); SV.cloudErr = ''; break; }
        catch (e) { SV.cloudErr = 'クラウドに保存できなかった'; if (++tries >= 3) break; await new Promise(r => setTimeout(r, 4000 * tries)); } } }
  } finally { SV.busy = false; }
}
function loadLocal() {   // 本体 → 予備1〜3 の順に、正しく読めるものを使う
  const keys = [SAVE_KEY, ...BAK_KEYS]; let bad = false;
  for (const k of keys) { let raw = null; try { raw = localStorage.getItem(k); } catch (e) {}
    if (!raw) continue;
    try { const d = JSON.parse(raw); if (validSave(d)) { if (bad || k !== SAVE_KEY) { SV.restored = k; try { const c = localStorage.getItem(SAVE_KEY); if (c) localStorage.setItem('nk_save_broken', c); } catch (e) {} } return d; } bad = true; } catch (e) { bad = true; } }
  if (bad) { SV.readOnly = true; SV.allBad = true; }   // 全部壊れていたら上書きしない
  return null;
}
let tabBC = null; try { tabBC = new BroadcastChannel('nk_tabs'); tabBC.onmessage = e => { const m = e.data || {}; if (m.id === SV.tab) return;
  if (m.ping && !SV.readOnly && !document.hidden) tabBC.postMessage({pong:1, id:SV.tab, to:m.id});
  if (m.pong && m.to === SV.tab) tabOther();
  if (m.take && !SV.readOnly) tabOther(); }; } catch (e) { tabBC = null; }
function tabWatch(fromStorage) {   // 別のタブで同じゲームを開いていたら、こちらは保存を止める（v0.56：返事のある画面だけを数える）
  if (SV.readOnly || SV.other) return;
  if (tabBC) { if (!fromStorage) tabBC.postMessage({ping:1, id:SV.tab}); return; }
  try { const o = JSON.parse(localStorage.getItem('nk_tab') || 'null'); if (o && o.id !== SV.tab && Date.now() - o.t < 6000 && fromStorage) tabOther(); } catch (e) {}
}
function tabOther() {
  try { if (!SV.readOnly && !SV.other) { SV.other = true; SV.readOnly = true;
    modal('別の画面で遊んでいます', '<div class="p">同じ宵闇亭が、別のタブか画面でも開かれているみたい。データが上書きし合わないよう、<b>こちらの画面ではセーブを止めた</b>。<br>こちらで続けるときは「こちらで続ける」を押してね（もう一方は閉じよう）。</div><div class="btn big grn" data-a="take">こちらで続ける</div>', 'tabw');
    bind('[data-a=take]', () => { SV.readOnly = false; SV.other = false; if (tabBC) tabBC.postMessage({take:1, id:SV.tab}); closeModal(); location.reload(); }); } } catch (e) {}
}
setInterval(() => { if (!SV.readOnly) { try { localStorage.setItem('nk_tab', JSON.stringify({id:SV.tab, t:Date.now()})); } catch (e) {} } }, 4000);
window.addEventListener('storage', e => { if (e.key === 'nk_tab') tabWatch(true); });
window.addEventListener('pagehide', () => { try { const o = JSON.parse(localStorage.getItem('nk_tab') || 'null'); if (o && o.id === SV.tab) localStorage.removeItem('nk_tab'); } catch (e) {} });
function saveFacHTML() {
  const t = x => x ? new Date(x).toLocaleTimeString('ja-JP', {hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '—';
  return `<div class="h">セーブ</div><div class="row"><div class="t"><b>自動セーブ</b><span>端末：${t(SV.lastLocal)}　クラウド：${dbRef ? t(SV.lastCloud) : 'なし（この端末だけに保存。別の端末へは下の「データの引き継ぎ」のコードで移す）'}${SV.err || SV.cloudErr ? `<br><i style="font-style:normal;color:#ff8a6a">⚠ ${SV.err || SV.cloudErr}</i>` : ''}<br>予備を3世代（5分ごと）とっている</span></div><div class="btn grn" data-a="savenow">今すぐ<br>セーブ</div></div>
    <div class="row"><div class="t"><b>予備から戻す</b><span>うまく動かないときに、少し前のセーブに戻せる</span></div><div class="btn" data-a="bak">見る</div></div>`;
}
function openBackups() {
  const rows = BAK_KEYS.map((k, i) => { let d = null; try { d = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) {} return {k, i, d:validSave(d) ? d : null}; });
  modal('予備から戻す', '<div class="p">戻すと、いまのデータは予備のデータに置きかわる（いまのデータは「戻す前」として1つ残す）。</div>' + rows.map(r => r.d ? `<div class="row"><div class="t"><b>予備${r.i + 1}</b><span>${new Date(r.d.last || 0).toLocaleString('ja-JP')}に保存　所持金 ${fmt(r.d.gold)}G・目標 ${r.d.goal || 0}</span></div><div class="btn" data-bk="${r.k}">戻す</div></div>` : `<div class="row" style="opacity:.5"><div class="t"><b>予備${r.i + 1}</b><span>まだない</span></div></div>`).join(''), 'bak');
  let arm = '';
  bind('[data-bk]', d => { if (arm !== d.bk) { arm = d.bk; toast('もう一度押すと、この予備に戻す', 2500); return; } try { lsSet('nk_save_prev', serialize()); const dd = JSON.parse(localStorage.getItem(d.bk)); dd.last = Date.now() + 10000; S = dd; fixState(); SV.readOnly = false; saveNow(true); toast('予備に戻した。再読み込みします……', 2000); setTimeout(() => location.reload(), 1200); } catch (e) { toast('戻せなかった', 2500); } });
}
async function initDb() {
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    const ref = db.collection('data/users/' + id).doc('save');
    const snap = await Promise.race([ref.get(), new Promise((_, rj) => setTimeout(() => rj('to'), 10000))]);
    dbRef = ref;
    const data = snap && (typeof snap.data === 'function' ? snap.data() : snap);
    const cj = data && (data.z ? await unpackZ(data.z).catch(() => null) : data.json); let cd = null; try { cd = cj ? JSON.parse(cj) : null; } catch (e) {}
    SV.lastCloud = data && data.at || 0;
    if (cd && validSave(cd) && (data.at > (S.last || 0) + 5000 || SV.allBad)) {
      S = cd; SV.readOnly = false; SV.allBad = false; fixState(); if (S.afk && S.afk.on) { const r = simulate((Date.now() - S.afk.t) / 1000); S.afk.on = false; showReport(r); } scene = S.pos.scene || 'interior'; player.x = S.pos.x; player.y = S.pos.y; buildActors(); toast('クラウドのセーブを読み込みました');
    }
  } catch (e) {}
}
function showReport(r) {
  if (!r || r.sec < 60) return;
  const h = Math.floor(r.sec / 3600), m = Math.floor(r.sec % 3600 / 60);
  const parts = [];
  if (r.sold) parts.push(`料理が <b>${r.sold}</b> 皿売れた（${fmt(r.earned)}G）`);
  if (r.branch) parts.push(`支店から <b>${fmt(r.branch)}</b>G`); if (r.night) parts.push(`裏営業で <b>${fmt(r.night.earned)}</b>G 売れた`); if (r.town) parts.push(`町から届いた：${r.town}`);
  if (r.spent) parts.push(`仕入れに <b>${fmt(r.spent)}</b>G 使った`);
  if (r.cooked) parts.push(`料理人が <b>${r.cooked}</b> 皿作った`);
  if (r.harvested) parts.push(`農夫が <b>${r.harvested}</b> 個収穫した`);
  if (r.fish) parts.push(`釣り人が <b>${r.fish}</b> 匹釣った`);
  if (r.proc) parts.push(`加工器具で <b>${r.proc}</b> 個できた`);
  if (r.trap) parts.push(`かご罠に <b>${r.trap}</b> 匹かかった`);
  if (r.fruit) parts.push(`農夫が果物を <b>${r.fruit}</b> 個収穫した`);
  if (r.ore) parts.push(`採掘人が鉱石を <b>${r.ore}</b> 個掘った`);
  if (r.ranch) parts.push(`牧場で卵・牛乳が <b>${r.ranch}</b> 個とれた`);
  modal('留守中の報告', `<div class="result"><div class="p">${h ? h + '時間' : ''}${m}分 のあいだに……</div>${parts.map(p => `<div class="p" style="color:var(--txt);font-size:${U * 4.94}px">${p}</div>`).join('') || '<div class="p">特に何も起きなかった。従業員を雇うと留守中も店が回る。</div>'}
    <div class="nm">${r.gold >= 0 ? '+' : ''}${fmt(r.gold)} G</div></div><div class="btn big" data-a="ok">閉じる</div>`, 'report');
  bind('[data-a]', closeModal);
}

// ====================================================== main loop
let prev = performance.now(), lastLogic = Date.now(), saveT = 0;
function frame(now) {
  const dt = Math.min(.1, (now - prev) / 1000); prev = now; tNow += dt;
  const wall = Date.now(), el = (wall - lastLogic) / 1000; lastLogic = wall;
  if (idleTick() || sleeping) {}
  else if (el > 5) {}
  else { step(el, true); const hh = hmNow(); if (hh >= 120 && hh < 360 && !tutOpen) sleepUntilMorning(true); }
  // goals
  const rk = rankIdx(); if (rk > (S.rankSeen || 0)) { S.rankSeen = rk; sfx('ok'); tut('rank'); toast(`🏮 店の格が上がった：<b>${RANKS[rk].n}</b>！ 新しい客層が訪れるようになった。`, 4500); }
  const evk = (curEvent() || {}).key || ''; if (evk !== frame.ev) { if (frame.ev !== undefined && evk) toast(`🎐 行事が始まった：<b>${curEvent().n}</b>　${curEvent().d}`, 4500); frame.ev = evk; }
  if (unl('guild') && S.guild && !(S.unl.arena)) tavUnl();
  const g = GOALS[S.goal]; if (g && g.chk(S)) { S.gold += g.r; S.goal++; const n = GOALS[S.goal]; sfx('ok'); toast(`✔ 目標達成：${g.t}（+${g.r}G）` + (n ? `<br><span style="color:var(--sub)">次：${n.t}</span>` : ''), 4000); (g.un || []).forEach(k => unlockFeature(k)); }
  // player
  padMove(dt); if (padDir) { player.mining = player.target = null; }
  bioStep(dt);
  if (!fishSt) { mineUpdate(dt); mrWander(dt); }
  if (player.path.length) { if (moveAlong(player, dt, 56) && player.onArrive) { const cb = player.onArrive; player.onArrive = null; cb(); } }
  if (scene === 'outside') resRefresh();
  actors.forEach(a => { if (a.path.length) moveAlong(a, dt, 26); else { a.wait -= dt; if (a.wait <= 0) npcThink(a); } });
  custVis.forEach(c => updCust(c, dt)); custVis = custVis.filter(c => !c.dead);
  updCam(false);
  render(dt);
  if ((frame.n = (frame.n || 0) + 1) % 6 === 0) updPrompt(); else placeAct();
  if (frame.n % 10 === 0) { hud(); chips(); } if (frame.n % 30 === 1) measureHud();
  if (frame.n % 60 === 0) syncHot();
  if (fishSt) { if (!tutOpen) fishUpdate(dt); if (fishSt) fishDraw(); }
  if (stallSt && !tutOpen) stallUpdate(dt);
  if (frame.n % 30 === 0) tutTick();
  if (frame.n % 120 === 60) achTick();
  if (frame.n % 90 === 30) kiwaStep();
  saveT += dt; if (saveT > 5 && dirty) { saveT = 0; saveNow(false); }
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(true); });
window.addEventListener('pagehide', () => { saveNow(true); try { const o = JSON.parse(localStorage.getItem('nk_tab') || 'null'); if (o && o.id === SV.tab) localStorage.removeItem('nk_tab'); } catch (e) {} });

async function boot() {
  bootMark('はじめ');
  if (bootPrev && !bootPrev.done && Date.now() - bootPrev.t < 600000) BOOTERR.push('前回の起動が「' + bootPrev.st + '」で止まった');
  layout();
  const ks = ['atlas','world','sil','gold','chars','charsUI','bg_interior','bg_outside','bg_farm','bg_farm2','logo','machines','workshop','rocks','bg_farm3','bg_farm4','bg_mine0','bg_mine1','bg_mine2','bg_mine3','bg_mine4','bg_mine5','bg_fpond','bg_fpier','bg_flake','tackle','bg_upstairs','stairs','bg_wilds','bg_stall','wagon','decor','bed','bg_b_river','bg_b_flower','bg_b_marsh','bg_b_volcano','bg_b_snow','bg_b_moon','bmap','gimmick','dog','rival','bg_cellar','cellarobj','trapdoor','bg_deep_deep','bg_deep_mist','bg_deep_dark','bg_deep_vein','bg_deep_den','bg_deep_garden','tower_a0','tower_a1','tower_a2','tower_a3','tower_a4','tower_ext','tower_far','tower_off','bg_port','exp_map','exp_map2','bg_desert','exp_map3','exp_map4','exp_map5','bg_tea','bg_capital','bg_isle','bg_guild1','bg_guild2','bg_guild3','bg_guild4','bg_guild5','guild_sign','cara_banner','wagons','cmark','bosses','curse_statue','bg_mranch','guild_sign2','bg_museum','bg_oldtown','bld_chapel','bld_library','bld_school','bld_theater','bld_bathhouse','bld_garden','bld_smithy','bld_gate','bg_mirror','place','bg_mfarm','bg_dg_mirror','bg_dgb_mirror','dg_gate_mirror','mgate','cportraits','steles','sealdoor','digspot','bigchest','crackwall','bg_vault','bg_ancient','moonstall','forge','stall_spr','bg_tavern','bg_arena','tv_boards','bg_hill','hill_ov2','hill_ov3','bg_tw0','bg_tw1','bg_tw2','bg_twb0','bg_twb1','bg_twb2','dg_gate_tower',...['l0','l1','l2','l3','l4','l5','deep','ship','temple','shrine','castle','volcano'].map(t => 'rocks_' + t),...['ship','temple','shrine','castle','volcano'].flatMap(k => ['bg_dg_' + k, 'bg_dgb_' + k, 'dg_gate_' + k])];
  introMsg('読み込み中…（画像）'); let nl = 0; await Promise.all(ks.map(k => loadImg(k, A[k]).then(() => { if (++nl % 20 === 0) introMsg(`読み込み中…（画像 ${nl}/${ks.length}）`); })));
  bootMark('画像の準備'); introMsg('読み込み中…（画像の準備）'); await new Promise(r => setTimeout(r, 20));
  for (const k of ['atlas','sil','gold','charsUI','tackle']) URL_[k] = BLOBU[k] || ('data:image/png;base64,' + A[k]);
  document.documentElement.style.setProperty('--frameimg', `url(${b64Blob(A.uiframe)})`);
  // 読み込んだ画像の元の文字列を捨てて、メモリを空ける（iPhone はメモリが足りないと画面ごと落ちる）
  for (const k of ks) if (BLOBU[k] && IMG[k] && !['uiframe', 'logo', 'bg_stall', 'decor', 'place_ui', 'medals'].includes(k)) A[k] = null;
  bootMark('ロゴ'); introMsg('読み込み中…（ロゴ）');
  if (IMG.logo) {
  const lg = $('logo'); lg.width = IMG.logo.width; lg.height = IMG.logo.height; lg.getContext('2d').drawImage(IMG.logo, 0, 0);
  const ls = Math.max(1, Math.floor(144 * U * .9 / IMG.logo.width)); lg.style.width = IMG.logo.width * ls + 'px'; lg.style.height = IMG.logo.height * ls + 'px';
  }
  bootMark('歩ける範囲'); introMsg('読み込み中…（地図）'); await new Promise(r => setTimeout(r, 10));
  buildWalk();
  bootMark('セーブを読む'); introMsg('読み込み中…（セーブ）'); await new Promise(r => setTimeout(r, 10));
  const sv = loadLocal(); let report = null;
  bootMark('場面の準備');
  if (sv && sv.v === 1) { S = sv; try { fixState(); } catch (e) { console.error(e); } if (S.afk && S.afk.on) { let sec = (Date.now() - S.afk.t) / 1000; const stuck = bootPrev && !bootPrev.done && (bootPrev.st === '留守中の計算' || bootPrev.st === '場面の準備'); if (stuck) { sec = 0; BOOTERR.push('前回の起動が留守中の計算で止まったので、今回は留守中の時間を進めずに始めた'); } bootMark('留守中の計算'); introMsg('留守中の時間を進めています… 0%'); await new Promise(r => setTimeout(r, 30)); try { report = await simulateAsync(sec, f => introMsg(`留守中の時間を進めています… ${Math.round(f * 100)}%`)); } catch (e) { console.error(e); BOOTERR.push('放置の計算：' + e.message); } S.afk.on = false; } scene = (S.pos && S.pos.scene) || 'interior'; if (!SCENES[scene] && scene !== 'mine') scene = 'interior'; try { [player.x, player.y] = scene === 'mine' ? [72, 52] : clampWalk(scene, S.pos.x, S.pos.y); } catch (e) { BOOTERR.push('位置：' + e.message); scene = 'interior'; player.x = 72; player.y = 200; } }
  else { syncShelf(); refillOrders(); }
  try { mineState(); if (scene === 'mine') { if (S.dg && S.dg.cur) genDgFloor(S.dg.cur.dg, S.dg.cur.f); else if (S.mine.floor) genFloor(S.mine.floor); else { scene = 'outside'; player.x = 48; player.y = 222; } }
  buildActors(); syncHot(); updCam(true); setTabs(); hud(); chips(); applyPad();
  } catch (e) { console.error(e); BOOTERR.push('場面の準備：' + e.message); try { FL = null; scene = 'interior'; player.x = 72; player.y = 200; buildActors(); syncHot(); updCam(true); setTabs(); hud(); chips(); applyPad(); } catch (e2) { BOOTERR.push('店内の準備：' + e2.message); } }
  bootDone = true; bootMark('done'); introMsg('タップしてはじめる');
  $('intro').onclick = () => {
    $('intro').remove(); if (!sv) tut('start'); setTimeout(showTut, 300); initAudio(); try { AC && AC.resume(); } catch (e) {}
    if (SV.restored) setTimeout(() => toast('⚠ セーブの一部が読めなかったので、予備のセーブから続きを読み込んだ', 6000), 800);
    if (SV.allBad) setTimeout(() => toast('⚠ 端末のセーブが読めなかった。クラウドのセーブを探しています（見つからないときは「施設」→「セーブ」→「予備から戻す」か引き継ぎコードで）', 8000), 800);
    tabWatch(); if (BOOTERR.length) setTimeout(() => toast('⚠ 起動時の問題：' + BOOTERR.slice(0, 3).join(' / '), 8000), 1200);
    if (report && report.sec >= 60) showReport(report);
    else if (!sv) toast('宵闇亭へようこそ。まずは裏の農場で種を植えよう。', 4000);
  };
  $('rep').style.cursor = 'pointer'; $('rep').onclick = () => { if (unl('fame')) openFame(); };
  lastLogic = Date.now();
  requestAnimationFrame(frame);
  initDb();
}
boot().catch(e => { console.error(e); bootDone = true; introMsg(`<span style="color:#e88">起動中にエラーが起きました（段階：${bootStage}）：${String(e && e.message || e).slice(0, 120)}</span><br>セーブは消えていません。ページを閉じて開き直してください。直らないときは、この文をそのまま伝えてください。`); });
