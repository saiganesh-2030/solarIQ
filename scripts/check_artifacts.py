import os, json, joblib
import pandas as pd
import numpy as np

def check():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    art_dir = os.path.join(base, 'ml', 'artifacts')
    
    print('=== Step 1: Check solar_rf_models.joblib ===')
    model_path = os.path.join(art_dir, 'solar_rf_models.joblib')
    assert os.path.exists(model_path), f'Missing {model_path}'
    bundle = joblib.load(model_path)
    print('Bundle keys:', list(bundle.keys()))
    print('Models:', list(bundle['models'].keys()))
    print('Features:', bundle['features'])
    print('Center %:', bundle['center_pct'])
    print('Spread %:', bundle['spread_pct'])
    print('Threshold %:', bundle['thr_pct'])
    print('K:', bundle['k'])
    print('Min pred kW:', bundle['min_pred_kw'])
    print('Plant flag:', bundle['plant_flag'])

    print('\n=== Step 2: Test Plant 1 Prediction ===')
    p1_model = bundle['models']['Plant 1']
    p1_feats = bundle['features']['Plant 1']
    sample_data = {
        'IRRADIATION': [0.8],
        'AMBIENT_TEMPERATURE': [30.0],
        'MODULE_TEMPERATURE': [50.0]
    }
    if 'TOD_SIN' in p1_feats:
        sample_data['TOD_SIN'] = [np.sin(2 * np.pi * 12 / 24)]
    if 'TOD_COS' in p1_feats:
        sample_data['TOD_COS'] = [np.cos(2 * np.pi * 12 / 24)]
    sample_df = pd.DataFrame(sample_data)[p1_feats]
    pred_kw = float(np.clip(p1_model.predict(sample_df)[0], 0, None))
    print(f'Plant 1 prediction for sample: {pred_kw:.2f} kW')

    print('\n=== Step 3: Check Artifact JSON and CSV Files ===')
    files_to_check = [
        'model_metrics.json',
        'feature_importance.json',
        'weather_analysis.json',
        'demo_upload.csv',
        'solar_clean.csv'
    ]
    for fn in files_to_check:
        fp = os.path.join(art_dir, fn)
        assert os.path.exists(fp), f'Missing file: {fp}'
        size_kb = os.path.getsize(fp) / 1024
        if fn.endswith('.json'):
            with open(fp, 'r', encoding='utf-8') as f:
                data = json.load(f)
            print(f'{fn}: parsed OK ({size_kb:.1f} KB, {len(data)} top-level keys)')
        else:
            df = pd.read_csv(fp)
            print(f'{fn}: parsed OK ({size_kb:.1f} KB, {len(df)} rows)')

    print('\n=== Step 4: Verify demo_upload.csv Schema ===')
    demo_fp = os.path.join(art_dir, 'demo_upload.csv')
    demo_df = pd.read_csv(demo_fp)
    req_cols = ['DATE_TIME', 'PLANT_ID', 'AC_POWER', 'AMBIENT_TEMPERATURE', 'MODULE_TEMPERATURE', 'IRRADIATION']
    for col in req_cols:
        assert col in demo_df.columns, f'Missing required column {col}'
    print(f'All {len(req_cols)} required columns present in demo_upload.csv.')
    print('ALL CHECKS PASSED!')

if __name__ == '__main__':
    check()

