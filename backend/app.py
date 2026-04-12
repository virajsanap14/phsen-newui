from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import os
import io
import pandas as pd
import numpy as np
import joblib

app = Flask(__name__)
# Enable CORS for frontend communication
CORS(app)

def preprocess_nix_csv(file_stream):
    """
    Preprocess the raw Nix CSV file exactly like the Streamlit version.
    """
    # Read the file content
    content = file_stream.read().decode("utf-8")
    stringio = io.StringIO(content)
    
    header_row_index = 0
    lines = stringio.readlines()
    
    # 1. Find the header row starting with "Index;"
    for i, line in enumerate(lines):
        if line.startswith("Index;"):
            header_row_index = i
            break
            
    # Create a buffer from the lines starting from header
    data_content = "".join(lines[header_row_index:])
    data_io = io.StringIO(data_content)
    
    # 2. Read CSV
    df_raw = pd.read_csv(data_io, sep=';', index_col=False)
    
    # 3. Clean column names
    df_raw.columns = df_raw.columns.str.strip()
    df_raw.columns = df_raw.columns.str.replace(' ', '_')
    
    # 4. Identify required features
    required_cols = ['L', 'a', 'b', 'L.1', 'c', 'h', 'X', 'Y', 'Z', 'sRGB_R', 'sRGB_G', 'sRGB_B']
    available_cols = df_raw.columns.tolist()
    
    final_cols = []
    missing_cols = []
    
    # 5. Handle missing columns or L.1 duplication
    for col in required_cols:
        if col in available_cols:
            final_cols.append(col)
        elif col == 'L.1' and 'L' in available_cols:
            df_raw['L.1'] = df_raw['L']
            final_cols.append('L.1')
        else:
            missing_cols.append(col)
            
    # Extract features for prediction
    X_pred = pd.DataFrame(df_raw[final_cols])
    
    # We return:
    # - X_pred: Features to feed into the ML model
    # - df_raw: The original DataFrame (we need it for the 'Name' column)
    # - missing_cols: To return a warning if something is missing
    return X_pred, df_raw, missing_cols


def run_ml_inference(X_pred):
    """
    Load the trained scikit-learn model and run predictions.
    """
    model_path = 'best_model_regression.pkl'
    if not os.path.exists(model_path):
        raise FileNotFoundError("Model file not found. Please train a model first.")
    
    model = joblib.load(model_path)
    preds = model.predict(X_pred)
    
    predictions = X_pred.copy()
    predictions['Predicted Phosphorus (ppm)'] = preds
    
    return predictions, 'Predicted Phosphorus (ppm)'


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "phosphorus-sensor-backend"})


@app.route('/api/model/status', methods=['GET'])
def model_status():
    """Check if a trained model exists, like Streamlit does on page load."""
    model_path = 'best_model_regression.pkl'
    exists = os.path.exists(model_path)
    return jsonify({"model_exists": exists})


@app.route('/api/predict', methods=['POST'])
def predict():
    # 1. Check if the file is in the request
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    try:
        # 2. Get user inputs from the form data (with defaults if missing)
        sample_mass = float(request.form.get('sample_mass', 2.0))
        volume_filtrate = float(request.form.get('volume_filtrate', 6.0))
        volume_extraction = float(request.form.get('volume_extraction', 20.0))
        volume_final = float(request.form.get('volume_final', 10.0))
        
        # 3. Preprocess the CSV
        X_pred, df_raw, missing_cols = preprocess_nix_csv(file)
        
        # 4. Run ML Inference (Placeholder)
        predictions, pred_col = run_ml_inference(X_pred)
        
        # 5. Process and format results
        front_cols = []
        
        # Extract identifier (Name) from the raw DataFrame
        if 'User_Color_Name' in df_raw.columns:
            predictions['User Color Name'] = df_raw['User_Color_Name'].values
            front_cols.append('User Color Name')
        elif 'Name' in df_raw.columns:
            predictions['Name'] = df_raw['Name'].values
            front_cols.append('Name')
            
        # 6. Calculate P Concentration (mg/kg soil)
        predictions['P Concentration (mg/kg soil)'] = (
            predictions[pred_col] * volume_final * volume_extraction * sample_mass
        ) / volume_filtrate
        
        front_cols.extend([pred_col, 'P Concentration (mg/kg soil)'])
        
        # Reorder columns: Identifiers & Predictions first, PyCaret features second
        remaining_cols = [c for c in predictions.columns if c not in front_cols]
        predictions = predictions[front_cols + remaining_cols]
        
        # Return the processed data as JSON
        result = {
            "success": True,
            "data": predictions.to_dict(orient='records'),
            "missing_columns": missing_cols
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/train/upload', methods=['POST'])
def train_upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    try:
        df = pd.read_csv(file)
        # Sanitize columns
        df.columns = df.columns.str.replace(' ', '_')
        for col in df.columns:
            try:
                df[col] = pd.to_numeric(df[col], errors='coerce')
                if df[col].isna().all():
                    df[col] = df[col].astype(str)
            except Exception:
                df[col] = df[col].astype(str)
                
        df.to_csv("sourcedata.csv", index=False)
        
        # EDA stats
        head = df.head().fillna("").to_dict(orient='records')
        describe_df = df.describe(include='all').fillna("")
        describe_df.insert(0, 'Metric', describe_df.index)
        describe = describe_df.to_dict(orient='records')
        missing = df.isnull().sum().to_dict()
        columns = df.columns.tolist()
        
        return jsonify({
            "success": True,
            "columns": columns,
            "head": head,
            "describe": describe,
            "missing": missing
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/train/rank', methods=['POST'])
def train_rank():
    data = request.json
    target = data.get('target')
    if not target:
        return jsonify({"error": "No target provided"}), 400
        
    try:
        df = pd.read_csv("sourcedata.csv")
        from mrmr import mrmr_regression
        
        # Clean target manually exactly as streamlit
        if df[target].hasnans:
            df = df.dropna(subset=[target])
        # Drop negative target
        df.loc[df[target] < 0, target] = 0
            
        X = df.drop(columns=[target])
        y = df[target]
        
        # ensure X is numeric where possible for MRMR
        for col in X.columns:
            if X[col].dtype == 'object':
                 try:
                     X[col] = pd.to_numeric(X[col], errors='coerce')
                 except Exception:
                     pass
        
        # drop strictly non-numeric columns from X to avoid MRMR crash
        X = X.select_dtypes(include=['number'])

        ranked_features = mrmr_regression(X=X, y=y, K=len(X.columns))
        return jsonify({"success": True, "ranked_features": ranked_features})
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@app.route('/api/train/run', methods=['POST'])
def train_run():
    data = request.json
    target = data.get('target')
    features = data.get('features', [])
    
    if not target:
        return jsonify({"error": "No target provided"}), 400
        
    try:
        from xgboost import XGBRegressor
        from sklearn.model_selection import cross_validate
        
        df = pd.read_csv("sourcedata.csv")
        
        if df[target].hasnans:
            df = df.dropna(subset=[target])
        if (df[target] < 0).any():
            df.loc[df[target] < 0, target] = 0
            
        if features:
            df = df[features + [target]]
        
        X = df.drop(columns=[target])
        y = df[target]
        
        # Train a single XGBoost model (handles NaN natively)
        model = XGBRegressor(n_estimators=100, random_state=42, verbosity=0)
        
        # Cross-validate for all metrics in a single pass (3x faster!)
        scoring = {'r2': 'r2', 'mae': 'neg_mean_absolute_error', 'rmse': 'neg_mean_squared_error'}
        cv_results = cross_validate(model, X, y, cv=5, scoring=scoring)
        
        r2_scores = cv_results['test_r2']
        mae_scores = -cv_results['test_mae']
        rmse_scores = np.sqrt(-cv_results['test_rmse'])
        
        # Fit on full data and save
        model.fit(X, y)
        joblib.dump(model, 'best_model_regression.pkl')
        
        results = [{
            'Model': 'XGBoost',
            'R2': round(r2_scores.mean(), 4),
            'MAE': round(mae_scores.mean(), 4),
            'RMSE': round(rmse_scores.mean(), 4),
        }]
        
        return jsonify({
            "success": True,
            "best_model": "XGBoost",
            "compare_metrics": results
        })
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@app.route('/api/train/download', methods=['GET'])
def train_download():
    path = os.path.abspath('best_model_regression.pkl')
    if not os.path.exists(path):
        return jsonify({"error": "Model not found. Train first."}), 404
    return send_file(path, as_attachment=True, download_name='trained_model.pkl')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # In production, use Gunicorn instead of the Flask dev server
    app.run(host='0.0.0.0', port=port, debug=True)
