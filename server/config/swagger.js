const swaggerJSDoc = require('swagger-jsdoc');

/**
 * Builds the OpenAPI spec from the JSDoc @swagger blocks in ./routes/*.js.
 * Route files stay the single source of truth for each endpoint's contract —
 * this file only defines the shared boilerplate (info, auth scheme, schemas)
 * so individual route annotations can stay short and just $ref these.
 */
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'MERN Keyboard Marketplace API',
        version: '1.0.0',
        description:
            'REST API for browsing keyboards, managing a seller\'s product catalog, and placing orders.',
    },
    servers: [
        {
            url: '/api',
            description: 'Current host, relative to /api',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description:
                    'Short-lived (15m) access token returned by /auth/login, /auth/register, or /auth/refresh.',
            },
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '65123abc456def7890123456' },
                    name: { type: 'string', example: 'Jane Seller' },
                    email: { type: 'string', format: 'email', example: 'jane@example.com' },
                    role: { type: 'string', enum: ['buyer', 'seller', 'admin'], example: 'seller' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            AuthResponse: {
                allOf: [
                    { $ref: '#/components/schemas/User' },
                    {
                        type: 'object',
                        properties: {
                            accessToken: { type: 'string', description: 'JWT access token, valid 15 minutes.' },
                        },
                    },
                ],
            },
            Product: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    user: { type: 'string', description: 'ObjectId of the seller who owns this product.' },
                    name: { type: 'string', example: 'Keychron Q1 Pro' },
                    image: { type: 'string', format: 'uri' },
                    brand: { type: 'string', example: 'Keychron' },
                    category: { type: 'string', example: 'Mechanical' },
                    description: { type: 'string' },
                    price: { type: 'number', example: 199.99 },
                    countInStock: { type: 'integer', example: 10 },
                    reviews: { type: 'array', items: { $ref: '#/components/schemas/Review' } },
                    rating: { type: 'number', example: 4.5, description: 'Average of all review ratings.' },
                    numReviews: { type: 'integer', example: 2 },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            Review: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    user: { type: 'string', description: 'ObjectId of the reviewing user.' },
                    name: { type: 'string', example: 'Jane Buyer' },
                    rating: { type: 'integer', minimum: 1, maximum: 5 },
                    comment: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            ProductInput: {
                type: 'object',
                required: ['name', 'image', 'brand', 'category', 'description', 'price', 'countInStock'],
                properties: {
                    name: { type: 'string' },
                    image: { type: 'string', format: 'uri' },
                    brand: { type: 'string' },
                    category: { type: 'string' },
                    description: { type: 'string' },
                    price: { type: 'number' },
                    countInStock: { type: 'integer' },
                },
            },
            OrderItem: {
                type: 'object',
                required: ['name', 'qty', 'image', 'price', 'product'],
                properties: {
                    name: { type: 'string' },
                    qty: { type: 'integer', example: 1 },
                    image: { type: 'string', format: 'uri' },
                    price: { type: 'number' },
                    product: { type: 'string', description: 'ObjectId of the Product being ordered.' },
                },
            },
            ShippingAddress: {
                type: 'object',
                required: ['address', 'city', 'postalCode', 'country'],
                properties: {
                    address: { type: 'string' },
                    city: { type: 'string' },
                    postalCode: { type: 'string' },
                    country: { type: 'string' },
                },
            },
            Order: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    user: { type: 'string' },
                    orderItems: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
                    shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
                    paymentMethod: { type: 'string', example: 'Stripe' },
                    taxPrice: { type: 'number' },
                    shippingPrice: { type: 'number' },
                    totalPrice: { type: 'number' },
                    isPaid: { type: 'boolean' },
                    paidAt: { type: 'string', format: 'date-time' },
                    isDelivered: { type: 'boolean' },
                    deliveredAt: { type: 'string', format: 'date-time' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            Error: {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'Not authorized, no token' },
                },
            },
        },
    },
};

const swaggerSpec = swaggerJSDoc({
    swaggerDefinition,
    apis: ['./routes/*.js'],
});

module.exports = swaggerSpec;
