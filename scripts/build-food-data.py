"""
Builds src/data/ingredients.json and src/data/dishes.json for Forge. The app does not run this, run it by hand if the lists change.

  python scripts/build-food-data.py <folder with INDB.xlsx> <USDA SR Legacy zip> <FCDB_7_4_14.xlsx>

Sources (all open):
  Indian Nutrient Databank (INDB), 1,014 South Asian dishes, Jaacks et al., open access CC BY:
    https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB-   (Anuvaad, based on ICMR-NIN IFCT 2017)
  USDA FoodData Central, SR Legacy (public domain), for ingredients and household measures:
    https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
  Food Composition Table for Bangladesh (2013), Institute of Nutrition and Food Science, University of Dhaka (FAO INFOODS):
    https://www.fao.org/fileadmin/templates/food_composition/documents/FCDB_7_4_14.xlsx
"""
import json
import re
import sys
import zipfile

import pandas as pd

indb_dir, sr_zip, bd_xlsx = sys.argv[1], sys.argv[2], sys.argv[3]
OUT = 'src/data/'

z = zipfile.ZipFile(sr_zip)
p = 'FoodData_Central_sr_legacy_food_csv_2018-04/'
food = pd.read_csv(z.open(p + 'food.csv'))
fn = pd.read_csv(z.open(p + 'food_nutrient.csv'), usecols=['fdc_id', 'nutrient_id', 'amount'])
fp = pd.read_csv(z.open(p + 'food_portion.csv'))
mu = pd.read_csv(z.open(p + 'measure_unit.csv')).set_index('id')['name'].to_dict()
NUT = {1008: 'k', 1003: 'p', 1005: 'c', 1004: 'f', 2000: 'su', 1258: 'sf', 1079: 'fi', 1093: 'so'}
fn = fn[fn.nutrient_id.isin(NUT)]
# millilitres in one US household measure, so a gram weight per measure becomes grams per ml
ML = {'cup': 236.588, 'tablespoon': 14.787, 'teaspoon': 4.929, 'fl oz': 29.574, 'milliliter': 1.0, 'liter': 1000.0}

# id, name, other names people search for, group, regex on the USDA description (first match wins), regex for a "piece" portion
ING = [
    ('olive-oil', 'Olive oil (virgin or regular)', 'extra virgin', 'Oils and fats', r'^Oil, olive, salad or cooking', None),
    ('vegetable-oil', 'Vegetable oil (canola)', 'cooking oil', 'Oils and fats', r'^Oil, canola$', None),
    ('sunflower-oil', 'Sunflower oil', '', 'Oils and fats', r'^Oil, sunflower, linoleic \(less than 60%\)', None),
    ('coconut-oil', 'Coconut oil', '', 'Oils and fats', r'^Oil, coconut$', None),
    ('mustard-oil', 'Mustard oil', 'sarson tel', 'Oils and fats', r'^Oil, mustard$', None),
    ('ghee', 'Ghee (clarified butter)', '', 'Oils and fats', r'^Butter, Clarified butter \(ghee\)', None),
    ('butter', 'Butter, salted', '', 'Oils and fats', r'^Butter, salted$', None),
    ('turmeric', 'Turmeric powder', 'haldi', 'Spices and salt', r'^Spices, turmeric, ground', None),
    ('chilli-powder', 'Chilli powder', 'red chili lal mirch kashmiri', 'Spices and salt', r'^Spices, chili powder', None),
    ('cayenne', 'Cayenne pepper', 'red pepper', 'Spices and salt', r'^Spices, pepper, red or cayenne', None),
    ('cumin', 'Cumin seeds', 'jeera', 'Spices and salt', r'^Spices, cumin seed', None),
    ('coriander-seed', 'Coriander seeds', 'dhania', 'Spices and salt', r'^Spices, coriander seed', None),
    ('curry-powder', 'Curry powder', 'garam masala masala', 'Spices and salt', r'^Spices, curry powder', None),
    ('black-pepper', 'Black pepper', 'kali mirch', 'Spices and salt', r'^Spices, pepper, black', None),
    ('cinnamon', 'Cinnamon, ground', 'dalchini', 'Spices and salt', r'^Spices, cinnamon, ground', None),
    ('cardamom', 'Cardamom', 'elaichi', 'Spices and salt', r'^Spices, cardamom', None),
    ('cloves', 'Cloves, ground', 'laung', 'Spices and salt', r'^Spices, cloves, ground', None),
    ('fenugreek', 'Fenugreek seeds', 'methi', 'Spices and salt', r'^Spices, fenugreek seed', None),
    ('mustard-seed', 'Mustard seeds', 'rai sarson', 'Spices and salt', r'^Spices, mustard seed, ground', None),
    ('paprika', 'Paprika', '', 'Spices and salt', r'^Spices, paprika', None),
    ('ginger-powder', 'Ginger powder', 'adrak sonth', 'Spices and salt', r'^Spices, ginger, ground', None),
    ('garlic-powder', 'Garlic powder', '', 'Spices and salt', r'^Spices, garlic powder', None),
    ('fennel', 'Fennel seeds', 'saunf', 'Spices and salt', r'^Spices, fennel seed', None),
    ('nutmeg', 'Nutmeg, ground', 'jaiphal', 'Spices and salt', r'^Spices, nutmeg, ground', None),
    ('bay-leaf', 'Bay leaf', 'tej patta', 'Spices and salt', r'^Spices, bay leaf', None),
    ('salt', 'Salt', 'table salt', 'Spices and salt', r'^Salt, table', None),
    ('okra', 'Okra, raw', 'bhindi lady finger ladies fingers', 'Vegetables', r'^Okra, raw', r'pod|medium|large'),
    ('onion', 'Onion, raw', 'pyaz', 'Vegetables', r'^Onions, raw', r'medium'),
    ('tomato', 'Tomato, raw', 'tamatar', 'Vegetables', r'^Tomatoes, red, ripe, raw, year round average', r'medium'),
    ('garlic', 'Garlic, raw', 'lehsun', 'Vegetables', r'^Garlic, raw', r'clove'),
    ('ginger', 'Ginger root, raw', 'adrak', 'Vegetables', r'^Ginger root, raw', None),
    ('green-chilli', 'Green chilli', 'hari mirch', 'Vegetables', r'^Peppers, hot chili, green, raw', r'pepper'),
    ('potato', 'Potato, raw', 'aloo', 'Vegetables', r'^Potatoes, flesh and skin, raw', r'medium'),
    ('cauliflower', 'Cauliflower, raw', 'gobi', 'Vegetables', r'^Cauliflower, raw', None),
    ('spinach', 'Spinach, raw', 'palak', 'Vegetables', r'^Spinach, raw', None),
    ('eggplant', 'Eggplant / aubergine, raw', 'baingan brinjal', 'Vegetables', r'^Eggplant, raw', None),
    ('peas', 'Green peas, raw', 'matar', 'Vegetables', r'^Peas, green, raw', None),
    ('carrot', 'Carrot, raw', 'gajar', 'Vegetables', r'^Carrots, raw', r'medium'),
    ('capsicum', 'Capsicum / bell pepper, green', 'shimla mirch', 'Vegetables', r'^Peppers, sweet, green, raw', r'medium'),
    ('cabbage', 'Cabbage, raw', 'patta gobi', 'Vegetables', r'^Cabbage, raw', None),
    ('coriander-leaves', 'Coriander leaves (cilantro)', 'dhania patta', 'Vegetables', r'^Coriander \(cilantro\) leaves, raw', None),
    ('mushroom', 'Mushrooms, white', '', 'Vegetables', r'^Mushrooms, white, raw', None),
    ('sweet-potato', 'Sweet potato, raw', 'shakarkand', 'Vegetables', r'^Sweet potato, raw, unprepared', r'medium'),
    ('pumpkin', 'Pumpkin, raw', 'kaddu', 'Vegetables', r'^Pumpkin, raw', None),
    ('green-beans', 'Green beans, raw', 'French beans', 'Vegetables', r'^Beans, snap, green, raw', None),
    ('cucumber', 'Cucumber, raw', 'kheera', 'Vegetables', r'^Cucumber, with peel, raw', None),
    ('lemon-juice', 'Lemon juice', 'nimbu', 'Vegetables', r'^Lemon juice, raw', None),
    ('tomato-paste', 'Tomato paste', '', 'Vegetables', r'^Tomato products, canned, paste, without salt', None),
    ('tomato-puree', 'Tomato puree', '', 'Vegetables', r'^Tomato products, canned, puree, without salt', None),
    ('chicken-breast', 'Chicken breast, raw', '', 'Meat, fish and eggs', r'^Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw$', None),
    ('chicken-thigh', 'Chicken thigh, skin on, raw', '', 'Meat, fish and eggs', r'^Chicken, broilers or fryers, thigh, meat and skin, raw', None),
    ('chicken-skin-on', 'Chicken, meat and skin, raw', 'whole chicken', 'Meat, fish and eggs', r'^Chicken, broilers or fryers, meat and skin, raw', None),
    ('lamb-mince', 'Lamb mince, raw', 'keema mutton', 'Meat, fish and eggs', r'^Lamb, ground, raw', None),
    ('beef-mince', 'Beef mince, 85% lean, raw', 'keema', 'Meat, fish and eggs', r'^Beef, ground, 85% lean meat / 15% fat, raw', None),
    ('egg', 'Egg, whole', 'anda', 'Meat, fish and eggs', r'^Egg, whole, raw, fresh', r'large'),
    ('salmon', 'Salmon, farmed, raw', '', 'Meat, fish and eggs', r'^Fish, salmon, Atlantic, farmed, raw', None),
    ('tilapia', 'Tilapia, raw', 'white fish', 'Meat, fish and eggs', r'^Fish, tilapia, raw', None),
    ('prawns', 'Prawns / shrimp, raw', 'jhinga', 'Meat, fish and eggs', r'^Crustaceans, shrimp, raw$', None),
    ('tofu', 'Tofu, firm', '', 'Meat, fish and eggs', r'^Tofu, raw, firm, prepared with calcium sulfate', None),
    ('lentils', 'Lentils, dry (masoor dal)', 'dal masoor', 'Legumes and grains', r'^Lentils, raw', None),
    ('chickpeas', 'Chickpeas, dry', 'chana', 'Legumes and grains', r'^Chickpeas \(garbanzo beans, bengal gram\), mature seeds, raw', None),
    ('kidney-beans', 'Kidney beans, dry', 'rajma', 'Legumes and grains', r'^Beans, kidney, all types, mature seeds, raw', None),
    ('moong', 'Mung beans, dry (moong dal)', 'moong', 'Legumes and grains', r'^Mung beans, mature seeds, raw', None),
    ('white-rice', 'White rice, dry', 'basmati chawal', 'Legumes and grains', r'^Rice, white, long-grain, regular, raw, unenriched', None),
    ('brown-rice', 'Brown rice, dry', '', 'Legumes and grains', r'^Rice, brown, long-grain, raw', None),
    ('white-rice-cooked', 'White rice, cooked', '', 'Legumes and grains', r'^Rice, white, long-grain, regular, unenriched, cooked', None),
    ('atta', 'Whole wheat flour (atta)', 'chapati roti', 'Legumes and grains', r'^Wheat flour, whole-grain \(', None),
    ('oats', 'Rolled oats', '', 'Legumes and grains', r'^Oats \(Includes', None),
    ('bread', 'White bread', '', 'Legumes and grains', r'^Bread, white wheat', r'slice'),
    ('milk-whole', 'Milk, whole', 'doodh full cream', 'Dairy', r'^Milk, whole, 3.25% milkfat, with added vitamin D', None),
    ('milk-lite', 'Milk, reduced fat (2%)', 'light blue', 'Dairy', r'^Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D', None),
    ('milk-skim', 'Milk, skim', 'trim green', 'Dairy', r'^Milk, nonfat, fluid, with added vitamin A and vitamin D', None),
    ('yogurt', 'Yoghurt, plain, whole milk', 'dahi curd', 'Dairy', r'^Yogurt, plain, whole milk', None),
    ('greek-yogurt', 'Greek yoghurt, plain, non fat', '', 'Dairy', r'^Yogurt, Greek, plain, nonfat', None),
    ('cream', 'Cream, heavy', '', 'Dairy', r'^Cream, fluid, heavy whipping', None),
    ('coconut-milk', 'Coconut milk, canned', 'nariyal doodh', 'Dairy', r'^Nuts, coconut milk, canned', None),
    ('cottage-cheese', 'Cottage cheese', '', 'Dairy', r'^Cheese, cottage, creamed, large or small curd', None),
    ('cheddar', 'Cheddar cheese', '', 'Dairy', r'^Cheese, cheddar', None),
    ('almonds', 'Almonds', 'badam', 'Nuts, sugar and drinks', r'^Nuts, almonds$', None),
    ('cashews', 'Cashews, raw', 'kaju', 'Nuts, sugar and drinks', r'^Nuts, cashew nuts, raw', None),
    ('peanuts', 'Peanuts, raw', 'moongphali', 'Nuts, sugar and drinks', r'^Peanuts, all types, raw', None),
    ('desiccated-coconut', 'Coconut, desiccated', 'nariyal', 'Nuts, sugar and drinks', r'^Nuts, coconut meat, dried \(desiccated\), not sweetened', None),
    ('sugar', 'Sugar, white', 'cheeni', 'Nuts, sugar and drinks', r'^Sugars, granulated', None),
    ('brown-sugar', 'Sugar, brown', 'jaggery gur', 'Nuts, sugar and drinks', r'^Sugars, brown', None),
    ('honey', 'Honey', 'shahad', 'Nuts, sugar and drinks', r'^Honey$', None),
    ('tea', 'Tea, black, brewed', 'chai', 'Nuts, sugar and drinks', r'^Beverages, tea, black, brewed, prepared with tap water', None),
    ('coffee', 'Coffee, brewed', '', 'Nuts, sugar and drinks', r'^Beverages, coffee, brewed, prepared with tap water', None),
]


def pick(rx):
    m = food[food.description.str.contains(rx, regex=True, case=False)]
    if not len(m):
        raise SystemExit('no USDA match for ' + rx)
    return m.iloc[0]


def r(v, d=2):
    v = float(v)
    return int(round(v)) if d == 0 else (int(v) if v == int(v) else round(v, d))


ingredients = []
for iid, name, aka, group, rx, piece_rx in ING:
    fid = int(pick(rx).fdc_id)
    n = {NUT[k]: float(v) for k, v in fn[fn.fdc_id == fid][['nutrient_id', 'amount']].itertuples(index=False)}
    o = {
        'id': iid, 'name': name, 'aka': aka, 'group': group,
        'k': r(n.get('k', 0), 0), 'p': r(n.get('p', 0), 1), 'c': r(n.get('c', 0), 1), 'f': r(n.get('f', 0), 1),
        'su': r(n.get('su', 0), 1), 'sf': r(n.get('sf', 0), 1), 'fi': r(n.get('fi', 0), 1), 'so': r(n.get('so', 0), 0),
    }
    dens, piece = [], None
    for _, q in fp[fp.fdc_id == fid].iterrows():
        unit = mu.get(q.measure_unit_id, '')
        amt = float(q.amount) if pd.notna(q.amount) and float(q.amount) > 0 else 1.0
        # Most SR Legacy portions have the measure written in the modifier ("tbsp", "cup, chopped"), not in the unit column.
        mod = re.match(r'(cup|tbsp|tablespoon|tsp|teaspoon|fl oz)\b', str(q.modifier).lower())
        if unit not in ML and mod:
            unit = {'tbsp': 'tablespoon', 'tsp': 'teaspoon'}.get(mod.group(1), mod.group(1))
        if unit in ML and pd.notna(q.gram_weight):
            dens.append(float(q.gram_weight) / (amt * ML[unit]))
        elif piece_rx and piece is None and pd.notna(q.gram_weight):
            if re.search(piece_rx, f'{unit} {q.modifier} {q.portion_description}', re.I):
                piece = float(q.gram_weight) / amt
    if dens:
        dens.sort()
        o['d'] = round(dens[len(dens) // 2], 3)  # grams per ml: the middle one of the household measures
    if piece:
        o['pc'] = round(piece, 1)
    if iid == 'ghee':
        o['d'] = 0.91  # SR Legacy has no spoon weight for ghee, it is about the same as butter oil
    ingredients.append(o)

json.dump(ingredients, open(OUT + 'ingredients.json', 'w'), separators=(',', ':'))
print(len(ingredients), 'ingredients')

d = pd.read_excel(indb_dir + '/INDB.xlsx')
dishes = []
for _, x in d.iterrows():
    kcal = float(x.energy_kcal)
    if not kcal or kcal != kcal:
        continue
    unit_k = float(x.unit_serving_energy_kcal) if pd.notna(x.unit_serving_energy_kcal) else 0
    grams = round(unit_k / kcal * 100) if unit_k else 0  # grams in one serving
    dishes.append({
        'id': x.food_code, 'name': str(x.food_name).strip(),
        'k': r(kcal, 0), 'p': r(x.protein_g, 1), 'c': r(x.carb_g, 1), 'f': r(x.fat_g, 1),
        'su': r(x.freesugar_g, 1), 'sf': r(float(x.sfa_mg) / 1000, 1), 'fi': r(x.fibre_g, 1), 'so': r(x.sodium_mg, 0),
        'u': str(x.servings_unit).strip(), 'g': grams,
    })
json.dump(dishes, open(OUT + 'dishes.json', 'w'), separators=(',', ':'))
print(len(dishes), 'dishes')


# ---------------- Bangladeshi foods (FCT for Bangladesh, per 100 g edible portion) ----------------
def num(v):
    """A number from a cell like 12.3, '(324)1360' style is handled by the caller, '[1.0]' or 'Tr' become 1.0 or None."""
    if v is None or (isinstance(v, float) and v != v):
        return None
    m = re.search(r'-?\d+(?:\.\d+)?', str(v).replace(',', ''))
    return float(m.group()) if m else None


bd = pd.read_excel(bd_xlsx, sheet_name='UserDB_Main_table', header=None)
group = ''
bdfoods = []
for _, x in bd.iterrows():
    code = str(x[0]).strip()
    if re.match(r'^\d\d [A-Za-z]', code):
        group = re.sub(r'^\d\d\s+', '', code)
        continue
    if not re.match(r'^\d\d_\d{4}$', code):
        continue
    en = str(x[1]).strip().rstrip('*').strip()
    bn = '' if pd.isna(x[2]) else str(x[2]).strip()
    energy = str(x[6])
    m = re.match(r'\(?\s*(\d+(?:\.\d+)?)\s*\)?\s*(\d+)?', energy)
    kcal = float(m.group(1)) if m and m.group(2) else None
    if kcal is None:
        kj = num(x[6])
        kcal = kj / 4.184 if kj else None
    if not kcal:
        continue
    o = {'id': 'bd-' + code, 'name': en, 'aka': bn, 'group': group, 'k': r(kcal, 0),
         'p': r(num(x[8]) or 0, 1), 'f': r(num(x[9]) or 0, 1), 'c': r(num(x[10]) or 0, 1),
         'fi': r(num(x[11]) or 0, 1), 'so': r(num(x[19]) or 0, 0)}
    bdfoods.append(o)
json.dump(bdfoods, open(OUT + 'bdfoods.json', 'w'), separators=(',', ':'))
print(len(bdfoods), 'Bangladeshi foods')
