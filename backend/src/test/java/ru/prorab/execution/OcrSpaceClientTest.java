package ru.prorab.execution;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import ru.prorab.execution.service.OcrSpaceClient;
import org.springframework.web.server.ResponseStatusException;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;
class OcrSpaceClientTest {
 @Test void sendsKeyOnlyInHeaderAndChecksProviderResult()throws Exception{
  var body=new AtomicReference<String>();var key=new AtomicReference<String>();var status=new java.util.concurrent.atomic.AtomicInteger(200);
  var response=new AtomicReference<>("{\"OCRExitCode\":1,\"IsErroredOnProcessing\":false,\"ParsedResults\":[{\"FileParseExitCode\":1,\"ParsedText\":\"ИТОГО 100.00\"}]}");
  var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
  server.createContext("/",e->{body.set(new String(e.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));key.set(e.getRequestHeaders().getFirst("apikey"));var bytes=response.get().getBytes(StandardCharsets.UTF_8);e.sendResponseHeaders(status.get(),bytes.length);e.getResponseBody().write(bytes);e.close();});server.start();
  try{var client=new OcrSpaceClient("test-secret","http://127.0.0.1:"+server.getAddress().getPort(),new ObjectMapper());assertEquals("ИТОГО 100.00",client.recognize(new byte[]{1,2}));assertEquals("test-secret",key.get());assertFalse(body.get().contains("test-secret"));assertTrue(body.get().contains("OCREngine=2"));assertTrue(body.get().contains("isTable=true"));
   response.set("{\"OCRExitCode\":3,\"IsErroredOnProcessing\":true,\"ErrorMessage\":\"private-provider-detail\"}");var err=assertThrows(ResponseStatusException.class,()->client.recognize(new byte[]{1}));assertEquals(502,err.getStatusCode().value());assertFalse(err.getReason().contains("private-provider-detail"));
   status.set(429);assertEquals(429,assertThrows(ResponseStatusException.class,()->client.recognize(new byte[]{1})).getStatusCode().value());
   status.set(200);response.set("not-json");assertEquals(502,assertThrows(ResponseStatusException.class,()->client.recognize(new byte[]{1})).getStatusCode().value());
  }finally{server.stop(0);}
 }
 @Test void absentKeyDoesNotSendRequest(){assertEquals(503,assertThrows(ResponseStatusException.class,()->new OcrSpaceClient("","http://127.0.0.1:1",new ObjectMapper()).recognize(new byte[]{1})).getStatusCode().value());}
}
