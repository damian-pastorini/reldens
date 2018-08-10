/**
 * Initialize!
 */
$(document).ready(function() {
    console.log('ready!');
    if($('#login-form').length) {
        $('#login-form').on('submit', function(e){
            console.log('Logging...');
            e.preventDefault();
        });
    }
});
