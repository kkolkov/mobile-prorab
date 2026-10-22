package ru.prorab.pricing.controller;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
@Controller
public class PriceAdminPageController {
 @GetMapping({"/porabadmin","/porabadmin/"}) public String page(){return "forward:/porabadmin/index.html";}
}
