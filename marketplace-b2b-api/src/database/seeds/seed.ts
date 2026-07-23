/**
 * Seeder de datos de demostracion.
 * Crea: 1 categoria de comision, 1 proveedor, 1 comprador, 1 producto con rangos de precio.
 * Ejecutar con: npm run seed
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { User } from '../../users/entities/user.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { Buyer } from '../../buyers/entities/buyer.entity';
import { CommissionCategory } from '../../commission-categories/entities/commission-category.entity';
import { Product } from '../../products/entities/product.entity';
import { PriceRange } from '../../products/entities/price-range.entity';
import { UserRole } from '../../common/enums/user-role.enum';

dotenv.config();

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'marketplace_b2b',
    entities: [User, Provider, Buyer, CommissionCategory, Product, PriceRange],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('Conectado a la base de datos. Iniciando seed...');

  const userRepo = dataSource.getRepository(User);
  const providerRepo = dataSource.getRepository(Provider);
  const buyerRepo = dataSource.getRepository(Buyer);
  const categoryRepo = dataSource.getRepository(CommissionCategory);
  const productRepo = dataSource.getRepository(Product);

  // 1. Categoria de comision
  let category = await categoryRepo.findOne({
    where: { name: 'Materiales de construccion' },
  });
  if (!category) {
    category = await categoryRepo.save(
      categoryRepo.create({
        name: 'Materiales de construccion',
        commissionPercentage: 8.5,
      }),
    );
    console.log('Categoria de comision creada: Materiales de construccion (8.5%)');
  }

  // 2. Usuario + perfil de Proveedor
  const providerPassword = await bcrypt.hash('Proveedor123', 10);
  let providerUser = await userRepo.findOne({
    where: { email: 'proveedor@demo.com' },
  });
  if (!providerUser) {
    providerUser = await userRepo.save(
      userRepo.create({
        email: 'proveedor@demo.com',
        password: providerPassword,
        role: UserRole.PROVEEDOR,
      }),
    );
  }

  let provider = await providerRepo.findOne({
    where: { userId: providerUser.id },
  });
  if (!provider) {
    provider = await providerRepo.save(
      providerRepo.create({
        userId: providerUser.id,
        companyName: 'Distribuidora ACME S.A.',
        taxId: '0614-123456-001-2',
        phone: '+503 7000-0000',
        address: 'Zona Franca, San Salvador',
      }),
    );
    console.log('Proveedor creado: proveedor@demo.com / Proveedor123');
  }

  // 3. Usuario + perfil de Comprador
  const buyerPassword = await bcrypt.hash('Comprador123', 10);
  let buyerUser = await userRepo.findOne({
    where: { email: 'comprador@demo.com' },
  });
  if (!buyerUser) {
    buyerUser = await userRepo.save(
      userRepo.create({
        email: 'comprador@demo.com',
        password: buyerPassword,
        role: UserRole.COMPRADOR,
      }),
    );
  }

  let buyer = await buyerRepo.findOne({ where: { userId: buyerUser.id } });
  if (!buyer) {
    buyer = await buyerRepo.save(
      buyerRepo.create({
        userId: buyerUser.id,
        companyName: 'Comercial Los Andes S.A. de C.V.',
        taxId: '0614-654321-002-1',
        phone: '+503 7111-1111',
        shippingAddress: 'Colonia Escalon, San Salvador',
      }),
    );
    console.log('Comprador creado: comprador@demo.com / Comprador123');
  }

  // 4. Catalogo de productos con rangos de precio por volumen (materiales de mayoreo)
  const catalogSeed = [
    {
      name: 'Varilla de acero corrugado 3/8"',
      description: 'Varilla de acero corrugado grado 60, 6 metros, para refuerzo estructural',
      basePrice: 8.75,
      totalStock: 5000,
      priceRanges: [
        { minQuantity: 1, maxQuantity: 99, unitPrice: 8.75 },
        { minQuantity: 100, maxQuantity: 499, unitPrice: 7.9 },
        { minQuantity: 500, maxQuantity: null, unitPrice: 6.95 },
      ],
    },
    {
      name: 'Cemento Portland tipo I (saco 42.5kg)',
      description: 'Cemento gris de uso general para construccion, saco de 42.5kg',
      basePrice: 6.5,
      totalStock: 8000,
      priceRanges: [
        { minQuantity: 1, maxQuantity: 199, unitPrice: 6.5 },
        { minQuantity: 200, maxQuantity: 999, unitPrice: 5.95 },
        { minQuantity: 1000, maxQuantity: null, unitPrice: 5.4 },
      ],
    },
    {
      name: 'Tuberia PVC 4" (tramo 6m)',
      description: 'Tuberia PVC para drenaje sanitario, tramo de 6 metros, cedula 20',
      basePrice: 14.2,
      totalStock: 2000,
      priceRanges: [
        { minQuantity: 1, maxQuantity: 49, unitPrice: 14.2 },
        { minQuantity: 50, maxQuantity: 199, unitPrice: 12.75 },
        { minQuantity: 200, maxQuantity: null, unitPrice: 11.5 },
      ],
    },
    {
      name: 'Malla electrosoldada 6x6 (lamina 2.44x6.10m)',
      description: 'Malla electrosoldada calibre 10, lamina estandar para losas y pisos',
      basePrice: 45.0,
      totalStock: 600,
      priceRanges: [
        { minQuantity: 1, maxQuantity: 19, unitPrice: 45.0 },
        { minQuantity: 20, maxQuantity: 99, unitPrice: 41.5 },
        { minQuantity: 100, maxQuantity: null, unitPrice: 37.9 },
      ],
    },
  ];

  const products: Product[] = [];
  for (const item of catalogSeed) {
    let product = await productRepo.findOne({
      where: { name: item.name, providerId: provider.id },
    });
    if (!product) {
      product = await productRepo.save(
        productRepo.create({
          name: item.name,
          description: item.description,
          basePrice: item.basePrice,
          totalStock: item.totalStock,
          reservedStock: 0,
          providerId: provider.id,
          commissionCategoryId: category.id,
          priceRanges: item.priceRanges as any,
        }),
      );
      console.log(`Producto creado: ${item.name} (con ${item.priceRanges.length} rangos de precio)`);
    }
    products.push(product);
  }

  console.log('\nSeed completado. Credenciales de prueba:');
  console.log('  Proveedor -> proveedor@demo.com / Proveedor123');
  console.log('  Comprador -> comprador@demo.com / Comprador123');
  console.log(`  Productos creados -> ${products.length}`);

  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('Error ejecutando el seed:', error);
  process.exit(1);
});
