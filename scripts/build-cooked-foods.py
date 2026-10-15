"""
Builds src/data/cooked.json for Forge: everyday cooked foods (air fried chicken, fish, steak and so on) per 100 g.
The app does not run this, run it by hand if the list changes.

  python scripts/build-cooked-foods.py <USDA SR Legacy zip>

Source: USDA FoodData Central, SR Legacy (public domain)
  https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip

An air fryer cooks with dry heat and no added oil, so its calories match USDA's "roasted" and "cooked, dry heat"
entries. Oil you spray or brush on is extra: add it separately (Olive oil is in the ingredients list).
Every entry names the USDA description it must match, so a wrong id stops the build instead of slipping in.
"""
import json
import sys
import zipfile

import pandas as pd

z = zipfile.ZipFile(sys.argv[1])
p = 'FoodData_Central_sr_legacy_food_csv_2018-04/'
food = pd.read_csv(z.open(p + 'food.csv')).set_index('fdc_id')
fn = pd.read_csv(z.open(p + 'food_nutrient.csv'), usecols=['fdc_id', 'nutrient_id', 'amount'])
NUT = {1008: 'k', 1003: 'p', 1005: 'c', 1004: 'f', 2000: 'su', 1258: 'sf', 1079: 'fi', 1093: 'so'}
fn = fn[fn.nutrient_id.isin(NUT)]

CH, FI, ME, SI = 'Air fried chicken', 'Air fried fish and seafood', 'Air fried meat', 'Air fryer sides and eggs'
AIR = 'air fryer airfryer roasted baked cooked '

# id, name, other words people search for, group, USDA fdc_id, text the USDA description must contain, serving grams, serving name
ITEMS = [
    ('breast-skinless', 'Air fried chicken breast, skinless', AIR + 'chicken breasts fillet fillets tenders', CH, 171477, 'breast, meat only, cooked, roasted', 172, 'breast fillet'),
    ('breast-skin', 'Air fried chicken breast, with skin', AIR + 'chicken breasts', CH, 171075, 'breast, meat and skin, cooked, roasted', 196, 'breast'),
    ('thigh-skinless', 'Air fried chicken thigh, skinless', AIR + 'chicken thighs boneless', CH, 172388, 'thigh, meat only, cooked, roasted', 116, 'thigh'),
    ('thigh-skin', 'Air fried chicken thigh, with skin', AIR + 'chicken thighs', CH, 173625, 'thigh, meat and skin, cooked, roasted', 137, 'thigh'),
    ('drumstick-skin', 'Air fried chicken drumstick, with skin', AIR + 'chicken drumsticks legs leg', CH, 173612, 'drumstick, meat and skin, cooked, roasted', None, None),
    # USDA has no roasted skinless drumstick, only this pan fried one, so it reads a little high for an air fryer.
    ('drumstick-skinless', 'Air fried chicken drumstick, skinless', AIR + 'chicken drumsticks legs leg', CH, 172375, 'drumstick, meat only, cooked, fried', None, None),
    ('wing-skin', 'Air fried chicken wings, with skin', AIR + 'chicken wing', CH, 173630, 'wing, meat and skin, cooked, roasted', None, None),
    ('wing-skinless', 'Air fried chicken wings, skinless', AIR + 'chicken wing', CH, 172392, 'wing, meat only, cooked, roasted', None, None),
    ('whole-skin', 'Air fried or roast whole chicken, meat and skin', AIR + 'chicken whole roast', CH, 171450, 'meat and skin, cooked, roasted', None, None),
    ('whole-meat', 'Air fried or roast whole chicken, meat only', AIR + 'chicken whole roast', CH, 171054, 'meat only, cooked, roasted', None, None),
    ('nuggets', 'Air fried chicken nuggets, frozen', AIR + 'chicken nuggets crumbed tenders', CH, 172111, 'nuggets, dark and white meat', 87, 'serving'),

    ('salmon-farmed', 'Air fried salmon fillet, farmed Atlantic', AIR + 'fish', FI, 175168, 'salmon, Atlantic, farmed, cooked, dry heat', None, None),
    ('salmon-wild', 'Air fried salmon fillet, wild Atlantic', AIR + 'fish', FI, 171998, 'salmon, Atlantic, wild, cooked, dry heat', None, None),
    ('salmon-chinook', 'Air fried king salmon (chinook)', AIR + 'fish nz king salmon', FI, 171999, 'salmon, chinook, cooked, dry heat', None, None),
    ('cod', 'Air fried cod fillet', AIR + 'fish white fish whitefish', FI, 171956, 'cod, Atlantic, cooked, dry heat', None, None),
    ('whiting', 'Air fried whiting fillet (close to hoki)', AIR + 'fish white fish whitefish hoki', FI, 175161, 'whiting, mixed species, cooked, dry heat', None, None),
    ('haddock', 'Air fried haddock fillet', AIR + 'fish white fish whitefish', FI, 174198, 'haddock, cooked, dry heat', None, None),
    ('pollock', 'Air fried pollock fillet', AIR + 'fish white fish whitefish', FI, 174237, 'pollock, Atlantic, cooked, dry heat', None, None),
    ('tilapia', 'Air fried tilapia fillet', AIR + 'fish', FI, 175177, 'tilapia, cooked, dry heat', None, None),
    ('snapper', 'Air fried snapper fillet', AIR + 'fish nz snapper', FI, 173699, 'snapper, mixed species, cooked, dry heat', None, None),
    ('trout', 'Air fried rainbow trout fillet', AIR + 'fish', FI, 173718, 'trout, rainbow, farmed, cooked, dry heat', None, None),
    ('mackerel', 'Air fried mackerel fillet', AIR + 'fish', FI, 175120, 'mackerel, Atlantic, cooked, dry heat', None, None),
    ('tuna-bluefin', 'Air fried tuna steak, bluefin', AIR + 'fish', FI, 173707, 'tuna, fresh, bluefin, cooked, dry heat', None, None),
    ('tuna-skipjack', 'Air fried tuna steak, skipjack', AIR + 'fish', FI, 172005, 'tuna, skipjack, fresh, cooked, dry heat', None, None),
    ('flounder', 'Air fried flounder or sole fillet', AIR + 'fish flatfish', FI, 174197, 'flatfish (flounder and sole species), cooked, dry heat', None, None),
    ('halibut', 'Air fried halibut fillet', AIR + 'fish', FI, 174201, 'halibut, Atlantic and Pacific, cooked, dry heat', None, None),
    ('catfish', 'Air fried catfish fillet', AIR + 'fish', FI, 175166, 'catfish, channel, farmed, cooked, dry heat', None, None),
    ('shrimp', 'Air fried prawns or shrimp, plain', AIR + 'shrimps prawn seafood', FI, 175180, 'shrimp, cooked', None, None),

    ('steak-sirloin', 'Air fried sirloin steak, lean and fat', AIR + 'beef steaks grilled', ME, 169458, 'top sirloin, steak, separable lean and fat, trimmed to 0" fat, choice, cooked, broiled', None, None),
    ('mince-90', 'Air fried beef mince patty, 90% lean', AIR + 'burger patties beef ground hamburger', ME, 174031, '90% lean meat / 10% fat, patty, cooked, broiled', 77, 'patty'),
    ('mince-85', 'Air fried beef mince patty, 85% lean', AIR + 'burger patties beef ground hamburger', ME, 174032, '85% lean meat / 15% fat, patty, cooked, broiled', 77, 'patty'),
    ('pork-chop', 'Air fried pork loin chop, lean and fat', AIR + 'pork chops grilled', ME, 167827, 'center loin (chops), bone-in, separable lean and fat, cooked, broiled', 157, 'chop'),
    ('pork-chop-lean', 'Air fried pork loin chop, lean only', AIR + 'pork chops grilled', ME, 168240, 'center loin (chops), bone-in, separable lean only, cooked, broiled', 146, 'chop'),
    ('bacon', 'Air fried bacon', AIR + 'pork rashers streaky', ME, 167914, 'bacon, cooked, baked', 8.1, 'slice'),
    ('sausage', 'Air fried pork sausage', AIR + 'sausages bangers', ME, 174578, 'Pork sausage, link/patty, cooked, pan-fried', None, None),
    ('lamb-chop', 'Air fried lamb loin chop, lean and fat', AIR + 'lamb chops grilled', ME, 172489, 'Lamb, loin, separable lean and fat, trimmed to 1/4" fat, choice, cooked, broiled', None, None),
    ('lamb-leg-nz', 'Roast New Zealand lamb leg, lean only', AIR + 'lamb nz', ME, 172516, 'Lamb, New Zealand, imported, frozen, leg, whole (shank and sirloin), separable lean only, cooked, roasted', None, None),
    ('turkey-breast', 'Air fried turkey breast, meat only', AIR + 'turkey', ME, 171496, 'Turkey, whole, breast, meat only, cooked, roasted', None, None),

    ('egg-boiled', 'Hard boiled egg (also made in an air fryer)', AIR + 'eggs', SI, 173424, 'Egg, whole, cooked, hard-boiled', 50, 'egg'),
    ('potato-baked', 'Air fried baked potato, flesh and skin', AIR + 'potatoes jacket', SI, 170093, 'Potatoes, baked, flesh and skin, without salt', 173, 'medium potato'),
    ('sweet-potato', 'Air fried sweet potato, baked in skin', AIR + 'kumara kumera', SI, 168483, 'Sweet potato, cooked, baked in skin, flesh, without salt', None, None),
    ('chips-frozen', 'Air fried frozen chips or fries', AIR + 'fries french wedges potato', SI, 169264, 'french fried, all types, salt added in processing, frozen, home-prepared, oven heated', None, None),
    ('tofu-fried', 'Air fried tofu', AIR + 'bean curd', SI, 172451, 'Tofu, fried', None, None),
]


# Bone in versions, for weighing the cooked piece with the bone still in. USDA's numbers are for the meat without the
# bone, and it publishes no bone weight, so the share of a cooked bone in piece that is meat (and skin) is an estimate
# from published figures that disagree (roughly 70 to 75% for a thigh, 50 to 75% for a drumstick), taken toward the
# cautious side. Every nutrient is the USDA meat and skin value times that share.
# id, name, other words, group, USDA fdc_id, text the USDA description must contain, edible share
BONE_IN = [
    ('breast-bone', 'Air fried chicken breast, bone in, with skin (weigh with the bone, about 75% is meat)', AIR + 'chicken breasts bone in on the bone', CH, 171075, 'breast, meat and skin, cooked, roasted', 0.75),
    ('thigh-bone', 'Air fried chicken thigh, bone in, with skin (weigh with the bone, about 70% is meat)', AIR + 'chicken thighs bone in on the bone', CH, 173625, 'thigh, meat and skin, cooked, roasted', 0.70),
    ('drumstick-bone', 'Air fried chicken drumstick, bone in, with skin (weigh with the bone, about 60% is meat)', AIR + 'chicken drumsticks legs leg bone in on the bone', CH, 173612, 'drumstick, meat and skin, cooked, roasted', 0.60),
    ('wing-bone', 'Air fried chicken wings, bone in, with skin (weigh with the bone, about 50% is meat)', AIR + 'chicken wing wings bone in on the bone', CH, 173630, 'wing, meat and skin, cooked, roasted', 0.50),
]


def r(v, d=2):
    return round(float(v), d)


out = []
for id_, name, aka, group, fid, must, g, u in ITEMS:
    desc = food.loc[fid, 'description']
    if must.lower() not in desc.lower():
        raise SystemExit(f'{id_}: USDA {fid} is "{desc}", expected it to contain "{must}"')
    n = {NUT[k]: float(v) for k, v in fn[fn.fdc_id == fid][['nutrient_id', 'amount']].itertuples(index=False)}
    o = {'id': 'cooked-' + id_, 'name': name, 'aka': aka.strip(), 'group': group,
         'k': r(n['k'], 0), 'p': r(n['p'], 1), 'c': r(n.get('c', 0), 1), 'f': r(n['f'], 1)}
    for key in ('su', 'sf', 'fi', 'so'):
        if key in n:
            o[key] = r(n[key], 1)
    if g:
        o['g'], o['u'] = g, u
    out.append(o)

for id_, name, aka, group, fid, must, share in BONE_IN:
    desc = food.loc[fid, 'description']
    if must.lower() not in desc.lower():
        raise SystemExit(f'{id_}: USDA {fid} is "{desc}", expected it to contain "{must}"')
    n = {NUT[k]: float(v) for k, v in fn[fn.fdc_id == fid][['nutrient_id', 'amount']].itertuples(index=False)}
    o = {'id': 'cooked-' + id_, 'name': name, 'aka': aka.strip(), 'group': group,
         'k': r(n['k'] * share, 0), 'p': r(n['p'] * share, 1), 'c': r(n.get('c', 0) * share, 1), 'f': r(n['f'] * share, 1)}
    for key in ('su', 'sf', 'fi', 'so'):
        if key in n:
            o[key] = r(n[key] * share, 1)
    out.append(o)

json.dump(out, open('src/data/cooked.json', 'w'), separators=(',', ':'))
print(len(out), 'cooked foods written to src/data/cooked.json')
