import { Module, OnModuleInit } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from './jobs/jobs.module';
import { QueueModule } from './jobqueue/queue.module';
import { AuthModule } from './auth/auth.module';

// console.log(config);
@Module({
  imports: [
    // MongooseModule.forRoot(
    //   `mongodb://${config.user}:${config.password}@${config.podName}-0.${config.host}:27017,${config.podName}-1.${config.host}:27017,${config.podName}-2.${config.host}:27017/?authSource=admin&replicaSet=rs0`,
    //   {
    //     dbName: config.dbName,
    //     useNewUrlParser: true,
    //     useCreateIndex: true,
    //     useFindAndModify: false,
    //     useUnifiedTopology: true,
    //   },
    // ),
    AuthModule,
    JobsModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  async onModuleInit() {
    // await connectDB();
  }
}
