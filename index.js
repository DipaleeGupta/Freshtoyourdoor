const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const {check, validationResult} = require('express-validator');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/organic_fresh', {
    useUnifiedTopology: true,
    useNewUrlParser: true
});
mongoose.set('useFindAndModify', false);


const fileUpload = require('express-fileupload');
const session = require('express-session');
var flash = require('express-flash-messages')


const Customer = mongoose.model('Customer',{
    firstname: String,
    lastname: String,
    email: String,
    telephone: String,
    address1: String,
    address2: String,
    city: String,
    postalCode: String,
    province: String,
    password: String,
    cardNumber: String,
    expMonthYear: String,
    cvv: String
});

const Order = mongoose.model('Order',{
    name: String,
    details: String,
    totalAmount: Number,
    customerName: String,
    customerAddress: String
});

const Vegetable = mongoose.model('Vegetable',{
    name: String,
    price: Number,
    description: String,
    vegetableimage: String
});

const Fruit = mongoose.model('Fruit',{
    name: String,
    price: Number,
    description: String,
    fruitimage: String
});

const Salad = mongoose.model('Salad',{
    name: String,
    price: Number,
    description: String,
    saladimage: String
});

const Cart = mongoose.model('Cart', {
    customerName: String,
    customerEmail: String,
    name: String,
    price: Number,
    image: String,
    quantity: Number
})

const TempCart = mongoose.model('TempCart', {
    customerName: String,
    customerEmail: String,
    name: String,
    price: Number,
    image: String,
    quantity: Number
})

var myApp = express();
myApp.use(session({
    secret: 'superrandomsecret',
    resave: false,
    saveUninitialized: true
}));
myApp.use(fileUpload());
myApp.use(bodyParser.urlencoded({ extended:false}));

myApp.use(bodyParser.json())
myApp.use(flash());

myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');



//----------- Customer Login -------------------
myApp.get('/login',function(req, res){
    if(req.session.userLoggedIn){
        res.redirect('/');
    }
    else{
        var isValid = null;
        res.render('login', {isValid:isValid});
    }
});

myApp.post('/login',[
    check('email', 'Please enter email').not().isEmpty(),
    check('password', 'Please enter password').not().isEmpty()
],function(req, res){
    const errors = validationResult(req);
    var isValid = null;
    if(!errors.isEmpty()){
        var errorsData = {
            errors: errors.array()
        }
        res.render('login', errorsData);
    }
    else{
        var email = req.body.email;
        var password = req.body.password;

        Customer.findOne({$or: [{email}]}).then(customer => {
            if(customer){
                if(customer.password == password){
                    req.session.email = customer.email;
                    req.session.name = customer.firstname;
                    req.session.userLoggedIn = true;

                    if(req.session.addCart){
                        TempCart.find({}).exec(function(err, cart){
                            for(i = 0; i<cart.length; i++){
                                console.log(req.session.cartProducts[i]._id == cart[i]._id);
                                TempCart.findByIdAndUpdate({_id:req.session.cartProducts[i]._id}).exec(function(err, carts){
                                    Customer.findOne({email:req.session.email}).exec(function(err, customer){
                                        console.log(customer.firstname);
                                        carts.customerName = customer.firstname;
                                        carts.customerEmail = customer.email;
                                        carts.save();
                                        var item = new Cart({
                                            customerName:carts.customerName,
                                            customerEmail:carts.customerEmail,
                                            name: carts.name,
                                            price: carts.price,
                                            image: carts.image,
                                            quantity: carts.quantity
                                        });
                                        item.save();
                                        req.session.addCart = false;
                                        TempCart.find({}).exec(function(err, cart){
                                            for(i = 0; i<cart.length; i++){
                                                TempCart.findByIdAndDelete({_id:req.session.cartProducts[i]._id}).exec();
                                            }
                                        });
                                    })
                                });
                            }
                        })
                    }

                    res.redirect('/');
                }
                else{
                    isValid = "Invalid Password!";
                    res.render('login', {isValid:isValid});
                }
            }
            else{
                isValid = "Email and Password Does Not Match!";
                res.render('login', {isValid:isValid});
            }
        })
        
    }
});

myApp.get('/logout',function(req, res){
    req.session.destroy();
    res.redirect('/');
});

//----------- Customer Create Account -------------------

myApp.get('/register',function(req, res){
    var isCustomer = null;
    res.render('register', {isCustomer:isCustomer});
});

myApp.post('/register',[
    check('firstname', 'Please enter First Name').not().isEmpty(),
    check('lastname', 'Please enter Last Name').not().isEmpty(),
    check('email').custom(value =>{
        var emailRegEx = /^[a-z0-9]{3,}\@[a-z]{2,}\.?[a-z]{2,}?\.[a-z]{2,}$/; //Format abc12@abc.com or abc12@abc.co.ca
        if(emailRegEx.test(value) == false){
            throw new Error('Enter a valid Email');
        }
        return true;
    }),
    check('telephone').custom(value =>{
        var phoneRegEx = /^[0-9]{3}\-?\s?[0-9]{3}\-?\s?[0-9]{4}$/; // Format 123-123-1234 or 123 123 1234
        if(phoneRegEx.test(value) == false){
            throw new Error('Enter a valid Phone Number');
        }
        return true;
    }),
    check('address1', 'Please enter the Address 1').not().isEmpty(),
    check('address2', 'Please enter the Address 2').not().isEmpty(),
    check('city', 'Please enter the City').not().isEmpty(),
    check('postCode').custom(value =>{
        var postcodeRegEx = /^[A-Z][0-9][A-Z]\s[0-9][A-Z][0-9]$/; //Format X0X 0X0
        if(postcodeRegEx.test(value) == false){
            throw new Error('Enter a valid Postal Code');
        }
        return true;
    }),
    check('province', 'Please select the Province').not().isEmpty(),
    check('password', 'Please enter the Password').not().isEmpty(),
    check('confirm', 'Please enter the Password for Confirmation').not().isEmpty()
],function(req, res){
    const errors = validationResult(req);
    var errorsData;
    var isCustomer = null;
    if(!errors.isEmpty()){
        errorsData = {
            errors: errors.array()
        }
        res.render('register',errorsData);
        //console.log(errorsData);
    }
    else{
        var firstname = req.body.firstname;
        var lastname = req.body.lastname;
        var email = req.body.email;
        var telephone = req.body.telephone;
        var address1 = req.body.address1;
        var address2 = req.body.address2;
        var city = req.body.city;
        var postalCode = req.body.postalCode;
        var province = req.body.province;
        var password = req.body.password;

        Customer.findOne({$or: [{email}]}).then(customer => {
            if(customer){
                isCustomer = 'Already a Customer!';
                res.render('register', {isCustomer:isCustomer});
            }
            else{
                if(req.body.confirm == password){
                    var myCustomer = new Customer({
                        firstname: firstname,
                        lastname: lastname,
                        email: email,
                        telephone: telephone,
                        address1: address1,
                        address2: address2,
                        city: city,
                        postalCode: postalCode,
                        province: province,
                        password: password,
                        cardNumber:"",
                        expMonth:"",
                        expYear:"",
                        cvv:""
                    });
                    myCustomer.save().then( ()=>{
                        console.log('New Customer Added');
                    });
                    res.render('login');
                }
                else{
                    isCustomer = "Password Does Not Match!";
                    res.render('register', {isCustomer:isCustomer})
                }
            }
        });
    }
});

//----------- Home Page -------------------
myApp.get('/',function(req, res){
    var sess = false;
    if(req.session.userLoggedIn){
        sess = req.session.userLoggedIn;
        res.render('index', {sess:sess});
    }
    else if(!req.session.userLoggedIn){
        res.render('index', {sess:sess});
    }
});

//---------- Search Product Page -----------
myApp.get('/products',function(req, res){
    var sess = false;
    if(req.session.userLoggedIn){
        sess = req.session.userLoggedIn;
        var match = null;
        if(req.query.search){
            const regexp = new RegExp(removeRegex(req.query.search), 'gi');
            Vegetable.find({name: regexp}).exec(function(err, vegetables){
                Fruit.find({name: regexp}).exec(function(err, fruits){
                    Salad.find({name: regexp}).exec(function(err, salads){
                        if(vegetables.length < 1 && fruits.length < 1 && salads.length < 1)
                        {
                            match = "No Match Found!";
                        }
                        res.render('products', {vegetables:vegetables, fruits:fruits, salads:salads, match:match, sess:sess});
                    });
                });
            });
        }
        else{
            Vegetable.find({}).exec(function(err, vegetables){
                Fruit.find({}).exec(function(err, fruits){
                    Salad.find({}).exec(function(err, salads){
                        res.render('products', {vegetables:vegetables, fruits:fruits, salads:salads, match:match, sess:sess});
                    });
                });
            });
        }
    }
    else if(!req.session.userLoggedIn){
        var match = null;
        if(req.query.search){
            const regexp = new RegExp(removeRegex(req.query.search), 'gi');
            Vegetable.find({name: regexp}).exec(function(err, vegetables){
                Fruit.find({name: regexp}).exec(function(err, fruits){
                    Salad.find({name: regexp}).exec(function(err, salads){
                        if(vegetables.length < 1 && fruits.length < 1 && salads.length < 1)
                        {
                            match = "No Match Found!";
                        }
                        res.render('products', {vegetables:vegetables, fruits:fruits, salads:salads, match:match, sess:sess});
                    });
                });
            });
        }
        else{
            Vegetable.find({}).exec(function(err, vegetables){
                Fruit.find({}).exec(function(err, fruits){
                    Salad.find({}).exec(function(err, salads){
                        res.render('products', {vegetables:vegetables, fruits:fruits, salads:salads, match:match, sess:sess});
                    });
                });
            });
        }
    }
});

//----------- Vegetables Page -------------------
myApp.get('/vegetables',function(req, res){
    var sess = false;
    if(req.session.userLoggedIn){
        sess = req.session.userLoggedIn;
        Vegetable.find({}).exec(function(err, vegetables){
            res.render('vegetables', {vegetables:vegetables, sess:sess});
        });
    }
    else if(!req.session.userLoggedIn){
        Vegetable.find({}).exec(function(err, vegetables){
            res.render('vegetables', {vegetables:vegetables, sess:sess});
        });
    }
});
//----------- Fruits Page -------------------
myApp.get('/fruits',function(req, res){
    var sess = false;
    if(req.session.userLoggedIn){
        sess = req.session.userLoggedIn;
        Fruit.find({}).exec(function(err, fruits){
            res.render('fruits', {fruits:fruits, sess:sess});
        });
    }
    else if(!req.session.userLoggedIn){
        Fruit.find({}).exec(function(err, fruits){
            res.render('fruits', {fruits:fruits, sess:sess});
        });
    }
});

//----------- Salads Page -------------------
myApp.get('/salads',function(req, res){
    var sess = false;
    if(req.session.userLoggedIn){
        sess = req.session.userLoggedIn;
        Salad.find({}).exec(function(err, salads){
            res.render('salads', {salads:salads});
        });
    }
    else if(!req.session.userLoggedIn){
        Salad.find({}).exec(function(err, salads){
            res.render('salads', {salads:salads, sess:sess});
        });
    }
});

//----------- Cart Page -------------------
myApp.get('/cart',function(req, res){
    var sess = false;
    if(req.session.userLoggedIn){
        sess = req.session.userLoggedIn;
        Cart.find({customerEmail:req.session.email}).exec(function(err, carts){
            var total=0;
            for(var i in carts){
                total += (carts[i].price * carts[i].quantity);
            }
            res.render('cart', {carts:carts, total:total, sess:sess});
        });
    }
    else if(!req.session.userLoggedIn){
        TempCart.find({}).exec(function(err, tempcarts){
            var total=0;
            for(var i in tempcarts){
                total += (tempcarts[i].price * tempcarts[i].quantity);
            }
            req.session.cartProducts = tempcarts;
            req.session.addCart = true;
            console.log(req.session.cartProducts);
            res.render('cart', {tempcarts:tempcarts, total:total, sess:sess});
        });
    }
});

//----------- Add Vegetables to Cart------------
myApp.get('/add_vege/:id',function(req, res){
    var id = req.params.id;
    if(req.session.userLoggedIn){
        Vegetable.findOne({_id:id}).exec(function(err, vegetable){
            var product = new Cart({
                customerName:req.session.name,
                customerEmail:req.session.email,
                name: vegetable.name,
                price: vegetable.price,
                image: vegetable.vegetableimage,
                quantity: 1
            });
            product.save().then( ()=>{
                req.session.addCart = true;
                console.log('Product Added to Cart');
            });
            res.redirect('/vegetables')
        })
    }
    else{
        Vegetable.findOne({_id:id}).exec(function(err, vegetable){
            var product = new TempCart({
                customerName:"",
                customerEmail:"",
                name: vegetable.name,
                price: vegetable.price,
                image: vegetable.vegetableimage,
                quantity: 1
            });
            product.save().then( ()=>{
                req.session.addCart = true;
                console.log('Product Added to Cart');
            });
            res.redirect('/vegetables')
        })
    }
});

//----------- Add Fruits to Cart------------
myApp.get('/add_fruit/:id',function(req, res){
    var id = req.params.id;
    if(req.session.userLoggedIn){
        Fruit.findOne({_id:id}).exec(function(err, fruit){
            var product = new Cart({
                customerName:req.session.name,
                customerEmail:req.session.email,
                name: fruit.name,
                price: fruit.price,
                image: fruit.fruitimage,
                quantity: 1
            });
            product.save().then( ()=>{
                req.session.addCart = true;
                console.log('Product Added to Cart');
            });
            res.redirect('/fruits')
        })
    }
    else{
        Fruit.findOne({_id:id}).exec(function(err, fruit){
            var product = new TempCart({
                customerName:"",
                customerEmail:"",
                name: fruit.name,
                price: fruit.price,
                image: fruit.fruitimage,
                quantity: 1
            });
            product.save().then( ()=>{
                req.session.addCart = true;
                console.log('Product Added to Cart');
            });
            res.redirect('/fruits')
        })
    }
});

//----------- Add Salads to Cart------------
myApp.get('/add_salad/:id',function(req, res){
    var id = req.params.id;
    if(req.session.userLoggedIn){
        Salad.findOne({_id:id}).exec(function(err, salad){
            var product = new Cart({
                customerName:req.session.name,
                customerEmail:req.session.email,
                name: salad.name,
                price: salad.price,
                image: salad.saladimage,
                quantity: 1
            });
            product.save().then( ()=>{
                req.session.addCart = true;
                console.log('Product Added to Cart');
            });
            res.redirect('/salads')
        })
    }
    else{
        Salad.findOne({_id:id}).exec(function(err, salad){
            var product = new TempCart({
                customerName:"",
                customerEmail:"",
                name: salad.name,
                price: salad.price,
                image: salad.saladimage,
                quantity: 1
            });
            product.save().then( ()=>{
                req.session.addCart = true;
                console.log('Product Added to Cart');
            });
            res.redirect('/salads')
        })
    }
    
});

//--------- Delete Product From Cart ---------
myApp.get('/delete_item/:id',function(req, res){
    var id = req.params.id;
    Cart.findByIdAndDelete({_id:id}).exec(function(err, cart){
        res.redirect('/cart');
    });
});

myApp.get('/delete_item1/:id',function(req, res){
    var id = req.params.id;
    TempCart.findByIdAndDelete({_id:id}).exec(function(err, tempcart){
        res.redirect('/cart');
    });
});

//-------- Update Quantity of Products------------
myApp.post('/update_item/:id',function(req, res){
    var id = req.params.id;
    Cart.findByIdAndUpdate({_id:id}).exec(function(err, cart){
        var quantity = req.body.quantity;
        cart.quantity = quantity;
        cart.save();
        res.redirect('/cart');
    });
});

myApp.post('/update_item1/:id',function(req, res){
    var id = req.params.id;
    TempCart.findByIdAndUpdate({_id:id}).exec(function(err, tempcart){
        var quantity = req.body.quantity;
        tempcart.quantity = quantity;
        tempcart.save();
        res.redirect('/cart');
    });
});

//----------- Checkout Page -------------------
myApp.get('/checkout',function(req, res){
    Cart.find({customerEmail:req.session.email}).countDocuments(function(err, count){
        if(count == 0){
            res.redirect('/cart');
        }
    })
    var sess = false;
    if(req.session.userLoggedIn){
        sess = req.session.userLoggedIn;
        Customer.findOne({email:req.session.email}).exec(function(err, customer){
            res.render('checkout', {sess:sess, customer:customer});
        });
    }
    else if(!req.session.userLoggedIn){
        res.redirect('/login')
    }
});

myApp.post('/checkout/:id', [
    check('firstname', 'Please enter First Name').not().isEmpty(),
    check('lastname', 'Please enter Last Name').not().isEmpty(),
    check('email').custom(value =>{
        var emailRegEx = /^[a-z0-9]{3,}\@[a-z]{2,}\.?[a-z]{2,}?\.[a-z]{2,}$/; //Format abc12@abc.com or abc12@abc.co.ca
        if(emailRegEx.test(value) == false){
            throw new Error('Enter a valid Email');
        }
        return true;
    }),
    check('telephone').custom(value =>{
        var phoneRegEx = /^[0-9]{3}\-?\s?[0-9]{3}\-?\s?[0-9]{4}$/; // Format 123-123-1234 or 123 123 1234
        if(phoneRegEx.test(value) == false){
            throw new Error('Enter a valid Phone Number');
        }
        return true;
    }),
    check('address1', 'Please enter the Address 1').not().isEmpty(),
    check('address2', 'Please enter the Address 2').not().isEmpty(),
    check('city', 'Please enter the City').not().isEmpty(),
    check('postCode').custom(value =>{
        var postcodeRegEx = /^[A-Z][0-9][A-Z]\s[0-9][A-Z][0-9]$/; //Format X0X 0X0
        if(postcodeRegEx.test(value) == false){
            throw new Error('Enter a valid Postal Code');
        }
        return true;
    }),
    check('province', 'Please select the Province').not().isEmpty(),
    check('cardNumber').custom(value =>{
        var cardRegEx = /^(\d{4}[- ]){3}\d{4}|\d{16}$/;
        if(cardRegEx.test(value) == false){
            throw new Error('Please enter a valid Card Number!');
        }
        return true;
    }),
    check('expMonthYear').custom(value =>{
        var monthRegEx = /^((0[1-9])|(1[0-2]))\/(\d{2})$/;
        if(monthRegEx.test(value) == false){
            throw new Error('Enter a valid Month and Year!');
        }
        return true;
    }),
    check('cvv').custom(value =>{
        var cvvRegEx = /^[0-9]{3}$/;
        if(cvvRegEx.test(value) == false){
            throw new Error('Enter a valid CVV number present behind your card!');
        }
        return true;
    })
],function(req, res){
    var sess = false;
    if(req.session.userLoggedIn){
        sess = req.session.userLoggedIn
        const errors = validationResult(req);
        var errorsData;
        if(!errors.isEmpty()){
            Customer.findOne({email:req.session.email}).exec(function(err, customer){
                errorsData = {
                    errors: errors.array()
                }
                res.render('checkout',{sess:sess, customer:customer, errors: errors.array()});
            });
        }
        else{
            var id = req.params.id;
            var firstname = req.body.firstname;
            var lastname = req.body.lastname;
            var email = req.body.email;
            var telephone = req.body.telephone;
            var address1 = req.body.address1;
            var address2 = req.body.address2;
            var city = req.body.city;
            var postalCode = req.body.postalCode;
            var province = req.body.province;
            var cardNumber = req.body.cardNumber;
            var expMonthYear = req.body.expMonthYear;
            var cvv = req.body.cvv;

            Customer.findOne({_id:id}).exec(function(err, cust){
                cust.firstname = firstname;
                cust.lastname = lastname;
                cust.email = email;
                cust.telephone = telephone;
                cust.address1 = address1;
                cust.address2 = address2;
                cust.city = city;
                cust.postalCode = postalCode;
                cust.province = province;
                cust.cardNumber = cardNumber;
                cust.expMonthYear = expMonthYear;
                cust.cvv = cvv;

                Cart.find({}).exec(function(err, cart){
                    var total=0;
                    var product = "";
                    for(var i in cart){
                        total += (cart[i].price * cart[i].quantity);
                        product += (cart[i].quantity+ " " +cart[i].name+" ");
                    }
                    var order = new Order({
                        name:product,
                        totalAmount:total,
                        customerName:cust.firstname + " " + cust.lastname,
                        customerAddress:cust.address1+" "+cust.address2+" "+cust.city+" "+cust.postalCode
                    });
                    order.save();
                    Cart.find({}).exec(function(err, cart){
                        for(i = 0; i<cart.length; i++){
                            Cart.findByIdAndDelete({_id:cart[i]._id}).exec();
                        }
                    });
                })

                cust.save();
            });
            res.redirect('/success');
        }
    }
    else if(!req.session.userLoggedIn){
        res.redirect('/login')
    }
});

//--------------Success Page----------------
myApp.get('/success',function(req, res){
    var sess = false;
    if(req.session.userLoggedIn){
        sess = req.session.userLoggedIn;
        res.render('success', {sess:sess});
    }
    else if(!req.session.userLoggedIn){
        res.redirect('/');
    }
});

//----------- Blog Page -------------------
myApp.get('/blog',function(req, res){
    res.render('blog');
});
//----------- Contact Page -------------------
myApp.get('/contact',function(req, res){
    res.render('contact');
});
//----------- About Us Page -------------------
myApp.get('/about-us',function(req, res){
    res.render('about-us');
});

function removeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

//----------- Start the server -------------------

myApp.listen(8080);
console.log('Server started at 8080 for Organic Fresh');