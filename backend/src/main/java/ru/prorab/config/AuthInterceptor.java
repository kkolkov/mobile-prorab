package ru.prorab.config;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.*;
import org.springframework.web.method.HandlerMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import ru.prorab.auth.service.AuthService;
import ru.prorab.project.repository.ProjectRepository;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
@Component
public class AuthInterceptor implements HandlerInterceptor {
 private final AuthService auth;private final ProjectRepository projects;
 private record Window(long start,int attempts) {}
 private final Map<String,Window> attempts=new ConcurrentHashMap<>();
 public AuthInterceptor(AuthService auth,ProjectRepository projects){this.auth=auth;this.projects=projects;}
 @Override public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler){
  if(!(handler instanceof HandlerMethod)||request.getMethod().equals("OPTIONS"))return true;
  response.setHeader("Cache-Control","no-store");
  String path=request.getRequestURI();
  if(path.equals("/api/auth/login")||path.equals("/api/auth/register")){
   long now=System.currentTimeMillis();attempts.entrySet().removeIf(e->now-e.getValue().start()>60_000);
   Window window=attempts.compute(request.getRemoteAddr(),(key,old)->old==null?new Window(now,1):new Window(old.start(),old.attempts()+1));
   if(window.attempts()>60)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Слишком много попыток. Подождите минуту.");
   return true;
  }
  var session=auth.authenticate(request.getHeader("Authorization"));
  request.setAttribute("userId",session.userId);request.setAttribute("sessionHash",session.tokenHash);
  Object variables=request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
  if(variables instanceof Map<?,?> map&&map.get("projectId") instanceof String raw){
   UUID id;try{id=UUID.fromString(raw);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Проект не найден");}
   var p=projects.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Проект не найден"));
   if(!session.userId.equals(p.getOwnerId()))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Проект не найден");
  }
  return true;
 }
}
