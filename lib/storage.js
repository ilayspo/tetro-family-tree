import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
const client=new S3Client({region:process.env.AWS_REGION||'us-east-2',endpoint:process.env.AWS_ENDPOINT_URL_S3,forcePathStyle:true,credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});
const bucket=()=>process.env.NEON_STORAGE_BUCKET||'tetro-photos';
export const put=(key,bytes,type)=>client.send(new PutObjectCommand({Bucket:bucket(),Key:key,Body:bytes,ContentType:type,CacheControl:'private, no-store'}));
export const get=key=>client.send(new GetObjectCommand({Bucket:bucket(),Key:key}));
export const remove=key=>client.send(new DeleteObjectCommand({Bucket:bucket(),Key:key}));
