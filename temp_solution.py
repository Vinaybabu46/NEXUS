import hashlib

def generate_md5_hash(password):
    # Encode the password to bytes
    encoded_password = password.encode('utf-8')
    
    # Generate the MD5 hash of the password
    md5_hash = hashlib.md5(encoded_password).hexdigest()
    
    return md5_hash