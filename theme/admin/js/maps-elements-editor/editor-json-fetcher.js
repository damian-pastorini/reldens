class EditorJsonFetcher
{
    constructor()
    {
        this.lastError = null;
    }

    async fetch(url, options)
    {
        try {
            let response = await fetch(url, options);
            if(!response.ok){
                this.lastError = new Error('HTTP '+response.status);
                return null;
            }
            return await response.json();
        } catch(error){
            this.lastError = error;
            return null;
        }
    }

    async post(url, body)
    {
        let result = await this.fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body
        });
        if(!result){
            return {success: false, error: 'requestFailed'};
        }
        return result;
    }
}
window.EditorJsonFetcher = EditorJsonFetcher;
